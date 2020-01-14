const core = require('@actions/core');
const github = require('@actions/github');
const request = require('request-promise');
const yaml = require('js-yaml');

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
  if (!match || !match.length) {
    console.log('Error: No matching ticket found');
    return '';
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

const addLabels = async (client, issueType, ticketLabelMappings) => {
  const PRNumber = getPrNumber();
  const label = ticketLabelMappings[issueType]
  await client.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: PRNumber,
    labels: label
  });
};

const fetchContent = async (client, repoPath) => {
  const response = await client.repos.getContents({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: repoPath,
    ref: github.context.sha
  });

  console.log('format buffer');

  return Buffer.from(response.data.content, 'base64').toString();
}

const getLabelMappings = async (client, configurationPath) => {
  const configurationContent = await fetchContent(
    client,
    configurationPath
  );

  console.log('load yaml');
  const configObject = yaml.safeLoad(configurationContent);
  return configObject;
}

const run = async () => {
  try {
    const gitToken = core.getInput('repo-token', { required: true });
    const client = new github.GitHub(gitToken);
    const configPath = core.getInput('configuration-path', { required: true });
    // { feature: 'Story', bug: 'Bug', techtask: 'Tech Task' }
    const ticketLabelMappings = await getLabelMappings(client, configPath);
    const title = github.context.payload.pull_request.title;
    const ticketId = getTicketId(title);
    if (ticketId) {
      const url = core.getInput('jira-url', { required: true });;
      const jiraToken = core.getInput('jira-token', { required: true });
      const jiraUsername = core.getInput('jira-username', { required: true });
      const issueType = await fetchIssueType(
        url,
        jiraUsername,
        jiraToken,
        ticketId
      );

      if (issueType) {
        addLabels(client, issueType, ticketLabelMappings);
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
