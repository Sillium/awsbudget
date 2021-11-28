# budget-api

Dies ist eine Lambda-Funktion, die die essentiellen Daten von AWS Budgets als JSON liefert. Sie kann bspw. als Backend für iOS Scriptable Widgets genutzt werden.

## Installation

- `AWS_ACCESS_KEY_ID` und `AWS_SECRET_ACCESS_KEY` des als Gitlab-Variablen hinterlegen
    - für den AWS-Account, in den deployed werden soll
    - momentan ist das billing-prd
- CI/CD Pipeline laufen lassen

## Aufruf

- Endpunkt im Build Output der Pipeline
- momentan bspw. `i6uz87z3yk.execute-api.eu-central-1.amazonaws.com/prod/budget/`
- Name des gewünschten AWS Budgets anhängen (bspw. `budget-monthly-324106133833`)
- Authorisierung des IAM-Users mit Berechtigung zu Lesen des AWS Budgets im Header:
    - account_id
    - aws_access_key_id
    - aws_secret_access_key