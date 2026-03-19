# from utils.spark_session import get_spark
from pyspark.sql import functions as F
from utils.session import get_spark
from pipelines.clean_data_pipeline import run_pipeline as clean_data_pipeline
from pipelines.metrics_pipeline import run_pipeline as metrics_pipeline

spark = get_spark()

df = spark.read.csv(
    "./data/communes_postgres_21k.csv",
    header=True
)
result = clean_data_pipeline(df)
# result = metrics_pipeline(result)
print("Pipeline terminé")

# result.coalesce(1).write.option("header","true").csv("./output/data_cleaned.csv", mode="overwrite")
result.coalesce(1).write.option("header","true").json("./output/data_cleaned.json", mode="overwrite")