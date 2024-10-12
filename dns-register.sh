#!/usr/bin/env bash
dig -t TXT _canister-id.vetkeys.shipstone.com
dig -t CNAME vetkeys.shipstone.com
dig -t CNAME _acme-challenge.vetkeys.shipstone.com
curl -sL -X POST \
    -H 'Content-Type: application/json' \
    https://icp0.io/registrations \
    --data @- > .dns_output <<EOF
{
    "name": "vetkeys.shipstone.com"
}
EOF
cat .dns_output
echo ""
ID=$(jq -r .id .dns_output)
echo "curl -sL -X GET \"https://icp0.io/registrations/${ID}\""
curl -sL -X GET "https://icp0.io/registrations/${ID}"