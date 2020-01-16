import * as core from '@actions/core';
import * as github from '@actions/github';
import * as yaml from 'js-yaml';
import * as request from 'request-promise';

const getPrNumber = () => {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    return undefined;
  }

  return pullRequest.number;
};

const addLabel = async (
  client: any,
  labelMappings: { [key: string]: string },
  issueType: string,
) => {
  const label = labelMappings[issueType];
  if (!label) {
    console.log(`No label for ticket type: ${issueType}.`);
  }

  const PRNumber = getPrNumber();
  console.log(`Adding label ${label} to PR #${PRNumber}.`);

  try {
    await client.issues.addLabels({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: PRNumber,
      labels: [label],
    });
  } catch (error) {
    console.error(`Failed to add label. Check that the ${label} label exists.`);
    throw (error);
  }
};

const fetchJIRAIssueType = async (
  ticketId: string,
  jiraURL: string,
  jiraUsername: string,
  jiraToken: string,
) => {
  const options = {
    method: 'GET',
    url: `${jiraURL}/rest/api/3/issue/${ticketId}`,
    auth: {
      username: jiraUsername,
      password: jiraToken,
    },
    headers: { Accept: 'application/json' },
  };

  try {
    const result = await request(options);
    const data = JSON.parse(result);
    return data.fields.issuetype.name;
  } catch (error) {
    console.error(`Failed to fetch JIRA Issue with id ${ticketId}`);
    throw (error);
  }
};

const fetchContent = async (client: any, repoPath: string) => {
  const response = await client.repos.getContents({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: repoPath,
    ref: github.context.sha,
  });

  return Buffer.from(response.data.content, 'base64').toString();
};

const getLabelMappings = async (
  client: github.GitHub,
  configurationPath: string,
): Promise<{ [key: string]: string }> => {
  try {
    const configurationContent = await fetchContent(client, configurationPath);
    const configObject = yaml.safeLoad(configurationContent);
    return configObject;
  } catch (error) {
    console.error('Failed to load config file.');
    throw (error);
  }
};

const getTicketIdFromTitle = (regexString: string) => {
  const title: string = github?.context?.payload?.pull_request?.title;
  const regex = new RegExp(regexString);
  const match = title.match(regex);
  if (!match || !match.length) {
    console.log(`No matching ticket found for title: ${title}. Exiting.`);
    return '';
  }
  console.log(`Found potential ticket id: ${match[1]}`);
  return match[1];
};

const getInputs = () => ({
  jiraURL: core.getInput('jira-url', { required: true }),
  jiraUsername: core.getInput('jira-username', { required: true }),
  jiraToken: core.getInput('jira-token', { required: true }),
  gitToken: core.getInput('repo-token', { required: true }),
  idRegex: core.getInput('ticket-regex', { required: true }),
  configPath: core.getInput('configuration-path', { required: true }),
});

const run = async () => {
  try {
    // 1. get inputs first to fail early
    const {
      jiraURL,
      jiraUsername,
      jiraToken,
      gitToken,
      idRegex,
      configPath,
    } = getInputs();
    const client = new github.GitHub(gitToken);

    // 2. Get ticket id from PR title
    const ticketId = getTicketIdFromTitle(idRegex);

    if (!ticketId) {
      return;
    }

    // 3. Load label mapping from config (do early to detect failur and prevent api calls)
    const labelMappings = await getLabelMappings(client, configPath);

    // 4. Fetch ticket type from JIRA
    const issueType = await fetchJIRAIssueType(ticketId, jiraURL, jiraUsername, jiraToken);

    // 5. Apply label according to ticket type
    addLabel(client, labelMappings, issueType);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
