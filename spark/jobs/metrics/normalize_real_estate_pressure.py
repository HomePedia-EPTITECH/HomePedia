from pyspark.sql import functions as F
from pyspark.sql.types import DoubleType
from pyspark.ml.feature import MinMaxScaler, VectorAssembler

def normalize_real_estate_pressure(df):
    assembler = VectorAssembler(inputCols=["annees_salaire_30m2"], outputCol="vec")
    df_vec = assembler.transform(df)
    scaler = MinMaxScaler(inputCol="vec", outputCol="tension_vec")
    df_scaled = scaler.fit(df_vec).transform(df_vec)

    # tentative sans UDF : vector_to_array -> element_at (index 1)
    try:
        tension_col = F.element_at(F.vector_to_array(F.col("tension_vec")), 1)
    except Exception:
        # fallback : extraire via UDF compatible toutes versions
        extract = F.udf(lambda v: float(v[0]) if v is not None else None, DoubleType())
        tension_col = extract(F.col("tension_vec"))

    return (df_scaled
        .withColumn("annees_salaire_30m2", F.round(F.col("annees_salaire_30m2"), 4))
        .withColumn("tension_immobiliere", F.round(tension_col, 4))
        .drop("vec", "tension_vec")
    )
