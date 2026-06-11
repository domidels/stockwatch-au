# =====================================================
# LAMBDA FUNCTION
# =====================================================

resource "aws_lambda_function" "api_handler" {
  function_name = "${var.project_name}-api-handler"
  role          = aws_iam_role.lambda_role.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.api_handler.repository_url}:latest"
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory

  environment {
    variables = {
      S3_BUCKET   = var.s3_bucket_name
      ENVIRONMENT = var.environment
    }
  }

  tags = var.tags

  depends_on = [aws_iam_role_policy.lambda_s3_read]
}

# =====================================================
# API GATEWAY
# =====================================================

resource "aws_api_gateway_rest_api" "api" {
  name        = "${var.project_name}-api"
  description = "API for StockWatch AU dashboard"

  tags = var.tags
}

resource "aws_api_gateway_resource" "api_resource" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "data"
}

resource "aws_api_gateway_resource" "api_method_resource" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_resource.id
  path_part   = "{method}"
}

# =====================================================
# API GATEWAY METHOD: GET
# =====================================================

resource "aws_api_gateway_method" "api_get" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_method_resource.id
  http_method      = "GET"
  authorization    = "NONE"
  request_parameters = {
    "method.request.path.method" = true
  }
}

resource "aws_api_gateway_integration" "api_get_integration" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_method_resource.id
  http_method      = aws_api_gateway_method.api_get.http_method
  type             = "AWS_PROXY"
  integration_http_method = "POST"
  uri              = aws_lambda_function.api_handler.invoke_arn
}

# =====================================================
# API GATEWAY METHOD: POST (CORS)
# =====================================================

resource "aws_api_gateway_method" "api_options" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_method_resource.id
  http_method      = "OPTIONS"
  authorization    = "NONE"
}

resource "aws_api_gateway_integration" "api_options_integration" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_method_resource.id
  http_method      = aws_api_gateway_method.api_options.http_method
  type             = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_integration_response" "api_options_response" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_method_resource.id
  http_method      = aws_api_gateway_method.api_options.http_method
  status_code      = "200"

  depends_on = [
    aws_api_gateway_integration.api_options_integration,
    aws_api_gateway_method_response.api_options_response
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "api_options_response" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_method_resource.id
  http_method      = aws_api_gateway_method.api_options.http_method
  status_code      = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# =====================================================
# LAMBDA PERMISSION FOR API GATEWAY
# =====================================================

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

# =====================================================
# API GATEWAY DEPLOYMENT
# =====================================================

resource "aws_api_gateway_deployment" "api" {
  rest_api_id = aws_api_gateway_rest_api.api.id

  depends_on = [
    aws_api_gateway_integration.api_get_integration,
    aws_api_gateway_integration.api_options_integration
  ]
}

resource "aws_api_gateway_stage" "api" {
  deployment_id = aws_api_gateway_deployment.api.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = var.environment

  tags = var.tags
}

# =====================================================
# API GATEWAY THROTTLING
# =====================================================

resource "aws_api_gateway_method_settings" "throttling" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name  = aws_api_gateway_stage.api.stage_name
  method_path = "*/*"

  settings {
    throttling_rate_limit  = 10   # max sustained requests per second
    throttling_burst_limit = 20   # max concurrent requests (absorbs page load spikes)
  }
}
