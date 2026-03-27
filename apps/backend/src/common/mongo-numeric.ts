import { Document } from "mongodb";

const NUMERIC_STRING_ARTIFACTS = [
  "EUR/m2",
  "EUR/m\u00B2",
  "eur/m2",
  "eur/m\u00B2",
  "/m2",
  "/m\u00B2",
  "m2",
  "m\u00B2",
  "\u20AC",
  "EUR",
  "eur",
  "%",
  "/5",
  "ans",
  "\u00A0",
  " "
];

export function buildMongoNumericExpression(field: string): Document {
  return {
    $let: {
      vars: {
        rawValue: { $ifNull: [`$${field}`, null] }
      },
      in: {
        $switch: {
          branches: [
            {
              case: {
                $in: [{ $type: "$$rawValue" }, ["double", "int", "long", "decimal"]]
              },
              then: { $toDouble: "$$rawValue" }
            },
            {
              case: { $eq: [{ $type: "$$rawValue" }, "string"] },
              then: {
                $let: {
                  vars: {
                    normalized: normalizeMongoNumericString("$$rawValue")
                  },
                  in: {
                    $cond: [
                      { $in: ["$$normalized", ["", ".", "-", "-."]] },
                      null,
                      {
                        $convert: {
                          input: "$$normalized",
                          to: "double",
                          onError: null,
                          onNull: null
                        }
                      }
                    ]
                  }
                }
              }
            }
          ],
          default: null
        }
      }
    }
  };
}

function normalizeMongoNumericString(input: string): Document {
  let expression: unknown = {
    $replaceAll: {
      input,
      find: ",",
      replacement: "."
    }
  };

  for (const artifact of NUMERIC_STRING_ARTIFACTS) {
    expression = {
      $replaceAll: {
        input: expression,
        find: artifact,
        replacement: ""
      }
    };
  }

  return expression as Document;
}
