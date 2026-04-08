variable "aws_region" {
  type    = string
  default = "eu-west-3"
}

variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type    = string
  default = "10.30.0.0/16"
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.30.1.0/24", "10.30.2.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.30.11.0/24", "10.30.12.0/24"]
}

variable "s3_bucket_name" {
  type = string
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "postgres_db" {
  type    = string
  default = "homepedia"
}

variable "postgres_user" {
  type    = string
  default = "homepedia"
}

variable "postgres_password" {
  type      = string
  sensitive = true
}

variable "postgres_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "skip_final_snapshot" {
  type    = bool
  default = true
}

variable "deletion_protection" {
  type    = bool
  default = false
}

variable "mongo_uri" {
  type      = string
  sensitive = true
}

variable "mongo_db" {
  type    = string
  default = "homepedia_raw"
}

variable "dvf_s3_key" {
  type    = string
  default = "dvf/full.csv"
}

variable "scraper_max_workers" {
  type    = string
  default = "12"
}

variable "log_retention_days" {
  type    = number
  default = 14
}
