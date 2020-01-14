# Contributing
After making changes to your code, run `yarn package` and commit the changes to the dist/

# JIRA Label Action

This action applys a label to a pull request based on the JIRA ticket type

## Inputs

### `repo-token`

**Required** github repo-token.

### `jira-token`

**Required** jira api token.

## Example usage

on: [pull_request]
jobs:
  apply_jira_label:
    runs-on: ubuntu-latest
    name: Adds PR label according to JIRA ticket type
    steps:
      - name: Checkout
        uses: actions/checkout@v1
        with:
          ref: rtb/actions # !!!!! change this before final submit
      - name: Hello world action step
        uses: ./packages/apply-jira-label
        with:
          repo-token: "${{ secrets.GITHUB_TOKEN }}"

