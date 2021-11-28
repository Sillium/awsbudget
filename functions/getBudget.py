# === Library imports: ========================================================
import os
import sys
import logging
import json
import boto3
from datetime import datetime
import re
import requests
#import pytz

# === Constants ===============================================================
ENV_LOG_LEVEL = os.environ.get('LOG_LEVEL')
# ENV_S3_BUCKET = os.environ.get('S3_BUCKET')

LOG = logging.getLogger()
LOG.setLevel(ENV_LOG_LEVEL)

#tz = pytz.timezone('Europe/Berlin')

RESPONSE_FAILURE = {'statusCode': 500,
                    'headers'   : {'Content-Type': 'text/plain'},
                    'body'      : 'Failure'}

def handle(event, context):
    """
    handle lambda call
    """
    try:
        LOG.debug(f"Event received: {json.dumps(event, indent=2, sort_keys=True)}")

        account_id = event['pathParameters']['accountId']
        budget_name = event['pathParameters']['budgetName']

        aws_access_key_id = event['headers']['aws_access_key_id']
        aws_secret_access_key = event['headers']['aws_secret_access_key']
        aws_role_name = event['headers']['aws_role_name']

        LOG.debug(f"Account ID: {account_id}")
        LOG.debug(f"Budget: {budget_name}")
        LOG.debug(f"AWS Role Name: {aws_role_name}")

        boto_sts = boto3.client(
            'sts',
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key
        )

        sts_response = boto_sts.assume_role(
            RoleArn=f"arn:aws:iam::{account_id}:role/{aws_role_name}",
            RoleSessionName='newsession'
        )

        newsession_id = sts_response["Credentials"]["AccessKeyId"]
        newsession_key = sts_response["Credentials"]["SecretAccessKey"]
        newsession_token = sts_response["Credentials"]["SessionToken"]

        budgets_client_assumed = boto3.client(
            'budgets',
            aws_access_key_id=newsession_id,
            aws_secret_access_key=newsession_key,
            aws_session_token=newsession_token,
            region_name='us-east-1'
        )

        budgets_response = budgets_client_assumed.describe_budget(
            AccountId=account_id,
            BudgetName=budget_name
        )

        iam_client_assumed = boto3.client(
            'iam',
            aws_access_key_id=newsession_id,
            aws_secret_access_key=newsession_key,
            aws_session_token=newsession_token,
            region_name='us-east-1'
        )

        iam_response = iam_client_assumed.list_account_aliases()
        account_alias = iam_response['AccountAliases'][0]

        response = budgets_response['Budget']
        response['Account'] = {
            'Alias': account_alias,
            'Id': account_id
        }

        # s3_client = boto3.client('s3')

        # s3_client.put_object(
        #     ACL = 'private',
        #     Bucket = ENV_S3_BUCKET,
        #     Body = json.dumps(response, indent=2, sort_keys=True, default=str),
        #     Key = account_id + '/' + budget_name + '/' + response['LastUpdatedTime'].strftime('%y-%m-%d') + '.json'
        # )

        # s3_client.put_object(
        #     ACL = 'private',
        #     Bucket = ENV_S3_BUCKET,
        #     Body = json.dumps(response, indent=2, sort_keys=True, default=str),
        #     Key = account_id + '/' + budget_name + '/current.json'
        # )

        LOG.debug(f"Budget response: {json.dumps(response, indent=2, sort_keys=True, default=str)}")

    except BaseException as error: # NOSONAR
        LOG.error(f"An exception occured: {error}")
        return RESPONSE_FAILURE

    LOG.info('success')
    return {
        'statusCode': 200,
        'headers'   : {'Content-Type': 'application/json'},
        'body'      : json.dumps(response, indent=2, sort_keys=True, default=str)
    }
