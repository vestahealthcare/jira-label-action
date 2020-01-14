const core = require('@actions/core');
const github = require('@actions/github');
const request = require('request-promise');

const fetchIssueType = async (url, username, password, ticketId) => {
  const options = {
    method: 'GET',
    url: `${url}/rest/api/3/issue/${ticketId}`,
    auth: {
      username: username,
      password: password,
    },
    headers: { 'Accept': 'application/json' }
  };

  const result = await request(options);
  const data = JSON.parse(result);
  return data.fields.issuetype.name;
};

const getTicketId = (title) => {
  // matchs [HT-1234] or [ht-1234] and returns HT-1234
  const regex = /\[((HT|ht)-\d*)]/;
  const match = title.match(regex);
  if (!match.length) {
    console.log("Error: No ticket found");
  }
  return match[1];
};

const getPrNumber = () => {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    return undefined;
  }

  return pullRequest.number;
}

const getLabels = (issueType) => {
  if (issueType === 'Story') {
    return ['feature'];
  }

  if (issueType === 'Bug') {
    return ['bugfix'];
  }

  if (issueType === 'Tech Task') {
    return ['techtask'];
  }

  return [];
};

const addLabels = async (issueType) => {
  const PRNumber = getPrNumber();
  const gitToken = core.getInput('repo-token', {required: true});
  const client = new github.GitHub(gitToken);
  await client.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: PRNumber,
    labels: getLabels(issueType)
  });
};

const run = async () => {
  try {
    const title = github.context.payload.pull_request.title;
    const ticketId = getTicketId(title);
    const url = core.getInput('jira-url', {required: true});;
    const jiraToken = core.getInput('jira-token', {required: true});
    const jiraUsername = core.getInput('jira-username', {required: true});
    const issueType = await fetchIssueType(
      url,
      jiraUsername,
      jiraToken,
      ticketId
    );
    addLabels(issueType);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
