SPARK_PACKAGES = org.mongodb.spark:mongo-spark-connector_2.13:10.4.0,org.postgresql:postgresql:42.7.3
SPARK_OPTS = \
	--conf "spark.ui.showConsoleProgress=false" \
	--conf "spark.driver.extraJavaOptions=-Dlog4j.configuration=file:./spark/log4j.properties" \
	--packages $(SPARK_PACKAGES)

spark:
	spark-submit $(SPARK_OPTS) spark/main.py

docker-up:
	docker compose -f docker/docker-compose.yml up -d

docker-down:
	docker compose -f docker/docker-compose.yml down

test-db:
	python -m unittest tests.test_database_integrity -v

.PHONY: spark docker-up docker-down test-db
