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
  label: string,
) => {
  const PRNumber = getPrNumber();
  console.log(`adding label ${label} to PR #${PRNumber}`);

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

const fetchJIRAIssueType = async (ticketId: string) => {
  const url = core.getInput('jira-url', { required: true });
  const username = core.getInput('jira-username', { required: true });
  const password = core.getInput('jira-token', { required: true });

  const options = {
    method: 'GET',
    url: `${url}/rest/api/3/issue/${ticketId}`,
    auth: {
      username,
      password,
    },
    headers: { Accept: 'application/json' },
  };

  try {
    const result = await request(options);
    const data = JSON.parse(result);
    return data.fields.issuetype.name;
  } catch (error) {
    console.error(`ERROR: Failed to fetch JIRA Issue with id ${ticketId}`);
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
    console.error('Failed to load config file');
    throw (error);
  }
};

const getTicketIdFromTitle = (title: string, regex: RegExp) => {
  const match = title.match(regex);
  if (!match || !match.length) {
    console.log(`Error: No matching ticket found for title: ${title}`);
    return '';
  }
  console.log(`Found potential ticket id: ${match[1]}`);
  return match[1];
};

const run = async () => {
  try {
    const client = new github.GitHub(
      core.getInput('repo-token', { required: true }),
    );

    // 1. Get ticket id from PR title
    const title: string = github?.context?.payload?.pull_request?.title;
    const regexString = core.getInput('ticket-regex', { required: true });
    const regex = new RegExp(regexString);
    const ticketId = getTicketIdFromTitle(title, regex);

    // 2. Load label mapping from config (do early to detect failur and prevent api calls)
    const configPath = core.getInput('configuration-path', { required: true });
    const labelMappings = await getLabelMappings(client, configPath);

    // 3. Fetch ticket type from JIRA
    const issueType = await fetchJIRAIssueType(ticketId);

    // 4. Apply label according to ticket type
    addLabel(client, labelMappings[issueType]);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
