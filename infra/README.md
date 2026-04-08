# HomePedia AWS Infra (MVP)

## 1) Build & push image to ECR

```bash
AWS_REGION=eu-west-3
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPO_NAME=homepedia-dev-jobs
IMAGE_TAG=v0.1.0

aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

docker build -f infra/docker/Dockerfile.jobs -t ${REPO_NAME}:${IMAGE_TAG} .
docker tag ${REPO_NAME}:${IMAGE_TAG} ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}
docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}
```

## 2) Provision infrastructure with Terraform

```bash
cd infra/terraform
cp environments/dev.tfvars.example environments/dev.tfvars

terraform init
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

## 3) Run ECS tasks

```bash
cd infra/terraform
CLUSTER=$(terraform output -raw ecs_cluster_name)
SUBNETS=$(terraform output -json ecs_subnet_ids | jq -r 'join(",")')
SG=$(terraform output -raw ecs_security_group_id)
```

### Bootstrap

```bash
TASK_BOOTSTRAP=$(terraform output -json ecs_task_definition_arns | jq -r '.bootstrap')

aws ecs run-task \
  --cluster "$CLUSTER" \
  --launch-type FARGATE \
  --task-definition "$TASK_BOOTSTRAP" \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG],assignPublicIp=ENABLED}"
```

### Scrapers / DVF / Spark

```bash
TASK_BDMV=$(terraform output -json ecs_task_definition_arns | jq -r '.scraping_bdmv')
TASK_VI=$(terraform output -json ecs_task_definition_arns | jq -r '.scraping_villeideale')
TASK_DVF=$(terraform output -json ecs_task_definition_arns | jq -r '.ingest_dvf')
TASK_SPARK=$(terraform output -json ecs_task_definition_arns | jq -r '.spark_job')

aws ecs run-task --cluster "$CLUSTER" --launch-type FARGATE --task-definition "$TASK_BDMV"  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG],assignPublicIp=ENABLED}"
aws ecs run-task --cluster "$CLUSTER" --launch-type FARGATE --task-definition "$TASK_VI"    --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG],assignPublicIp=ENABLED}"
aws ecs run-task --cluster "$CLUSTER" --launch-type FARGATE --task-definition "$TASK_DVF"   --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG],assignPublicIp=ENABLED}"
aws ecs run-task --cluster "$CLUSTER" --launch-type FARGATE --task-definition "$TASK_SPARK" --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG],assignPublicIp=ENABLED}"
```

## 4) CloudWatch logs

```bash
aws logs tail /ecs/homepedia-dev/scraping-bdmv --follow --since 1h
aws logs tail /ecs/homepedia-dev/spark-job --follow --since 1h
```
