#!/usr/bin/env bash

# Copyright 2017 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License")
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

deployVersion=$1
account=$2

usage="Usage: deploy.sh `date +%Y-%m-%d` user@gmail.com"

if [ -z "$deployVersion" ]
then
  echo "App version not specified."
  echo $usage
  exit 0
fi

if [ -z "$account" ]
then
  echo "Account email not specified."
  echo $usage
  exit 0
fi

readonly APPDIR=$(dirname $BASH_SOURCE)

echo "Deploying app version: $deployVersion"
gcloud app deploy $APPDIR/../app.yaml \
    --project lighthouse-viewer --version $deployVersion \
    --account $account
