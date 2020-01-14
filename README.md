# Contributing
After making changes to your code, run `yarn package` and commit the changes to the dist/

# JIRA Label Action

This action applys a label to a pull request based on the JIRA ticket type

## Inputs

### `repo-token`

**Required** github repo-token.

### `jira-token`

**Required** jira api token. Can be created here: https://confluence.atlassian.com/cloud/api-tokens-938839638.html

This should be placed in your github secrets!

### `jira-url`

**Required** URL for your JIRA rest api

### 'jira-username`

**Required** JIRA username associated with the jira-token

### 'ticket-regex'

**Required** RegExp for matching ticket ids in your commit message.

For example:  Our commit messages follow the format of `[HT-1234]: Commit message`.

We use the regex `\[((HT|ht)-\d*)]` to extract HT-1234 which is the JIRA ticket id

## Example usage

```
# ./github/workflows/jira-ticket-labeler.yml
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
          jira-url: '${{ secrets.JIRA_URL }}'
          jira-username: '${{ secrets.JIRA_USERNAME }}'
          jira-token: '${{ secrets.JIRA_TOKEN }}'
          ticket-regex: '\[((HT|ht)-\d*)]'
```

Along with

```
# ./github/jira-ticket-labeler.yml
Story: 'Feature'
Bug: 'bug'
Tech Task: 'techtask'
```

Should apply the label 'Feature' to any JIRA ticket of the type 'Story'

## Shout out
to https://github.com/actions/labeler which I used as a guide for creating this.
