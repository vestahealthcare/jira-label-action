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

```
on: [pull_request]
jobs:
  apply_jira_label:
    runs-on: ubuntu-latest
    name: Adds PR label based on JIRA ticket type
    steps:
      - name: Checkout
        uses: actions/checkout@v1
      - name: JIRA Label Action
        id: jira
        uses: hometeam/jira-label-action@master
        with:
          repo-token: '${{ secrets.GITHUB_TOKEN }}'
          jira-url: '<JIRA REST API>'
          jira-username: '<JIRA USER NAME>'
          jira-token: '<JIRA API TOKEN>' # add via secrets
```

