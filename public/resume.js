const promptForm = document.querySelector("#prompt-form");
const promptInput = document.querySelector("#resume-prompt");
const conversation = document.querySelector("#conversation");
const skillInputs = Array.from(
  document.querySelectorAll('input[name="skill"]'),
);
const skillCount = document.querySelector("#skill-count");
const newChatButton = document.querySelector("#new-chat");
const initialConversation = conversation.innerHTML;

function getSelectedSkills() {
  return skillInputs
    .filter((input) => input.checked)
    .map((input) => input.value);
}

function updateSkillCount() {
  const count = getSelectedSkills().length;
  skillCount.textContent = `${count} ${count === 1 ? "skill" : "skills"} selected`;
}

function addUserMessage(prompt) {
  const message = document.createElement("article");
  message.className = "message user-message";

  const text = document.createElement("p");
  text.textContent = prompt;
  message.append(text);
  conversation.append(message);
}

function exportResumeAsPdf(skills, summaryText, bulletContent) {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    window.alert(
      "The PDF preview was blocked. Allow pop-ups for this site and try again.",
    );
    return;
  }

  printWindow.opener = null;
  const printDocument = printWindow.document;
  printDocument.title = "John Bob — Resume";

  const style = printDocument.createElement("style");
  style.textContent = `
    @page { size: letter; margin: 0.65in; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #172e27;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
    }
    h1 {
      margin: 0;
      color: #073b2d;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 28pt;
      letter-spacing: -0.03em;
    }
    .subtitle { margin: 3px 0 22px; color: #52635d; }
    h2 {
      margin: 20px 0 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid #a49665;
      color: #005035;
      font-size: 9pt;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }
    p { margin: 0; }
    ul { margin: 0; padding-left: 18px; }
    li { margin-bottom: 6px; }
    .skills { display: flex; flex-wrap: wrap; gap: 7px; }
    .skill {
      padding: 4px 8px;
      border-radius: 999px;
      background: #f5f4ef;
      color: #073b2d;
      font-size: 9pt;
      font-weight: 700;
    }
  `;
  printDocument.head.append(style);

  const name = printDocument.createElement("h1");
  name.textContent = "John Bob";
  const subtitle = printDocument.createElement("p");
  subtitle.className = "subtitle";
  subtitle.textContent = "Computer Science Student · UNC Charlotte";

  const summaryHeading = printDocument.createElement("h2");
  summaryHeading.textContent = "Professional summary";
  const summary = printDocument.createElement("p");
  summary.textContent = summaryText;

  const experienceHeading = printDocument.createElement("h2");
  experienceHeading.textContent = "Selected experience";
  const bullets = printDocument.createElement("ul");
  bulletContent.forEach((item) => {
    const bullet = printDocument.createElement("li");
    bullet.textContent = item;
    bullets.append(bullet);
  });

  const skillsHeading = printDocument.createElement("h2");
  skillsHeading.textContent = "Skills";
  const skillsList = printDocument.createElement("div");
  skillsList.className = "skills";
  (skills.length > 0 ? skills : ["Software Development"]).forEach((skill) => {
    const skillTag = printDocument.createElement("span");
    skillTag.className = "skill";
    skillTag.textContent = skill;
    skillsList.append(skillTag);
  });

  printDocument.body.append(
    name,
    subtitle,
    summaryHeading,
    summary,
    experienceHeading,
    bullets,
    skillsHeading,
    skillsList,
  );

  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
}

function addAssistantDraft(skills) {
  const message = document.createElement("article");
  message.className = "message assistant-message";

  const avatar = document.createElement("span");
  avatar.className = "message-avatar";
  avatar.textContent = "R";

  const content = document.createElement("div");
  content.className = "message-content";

  const author = document.createElement("strong");
  author.textContent = "ResumeGPT";

  const intro = document.createElement("p");
  intro.textContent =
    "Here is a focused first draft based on your profile and selected skills.";

  const draft = document.createElement("div");
  draft.className = "resume-draft";

  const name = document.createElement("h3");
  name.textContent = "John Bob";

  const subtitle = document.createElement("small");
  subtitle.textContent = "Computer Science Student · UNC Charlotte";

  const summaryHeading = document.createElement("h4");
  summaryHeading.textContent = "Professional summary";

  const summary = document.createElement("p");
  const skillPhrase =
    skills.length > 0 ? skills.join(", ") : "software development";
  summary.textContent = `Motivated computer science student with hands-on experience in ${skillPhrase}. Brings a thoughtful, collaborative approach to building reliable solutions and learning new technologies.`;

  const experienceHeading = document.createElement("h4");
  experienceHeading.textContent = "Selected experience";

  const bullets = document.createElement("ul");
  const bulletContent = [
    `Applied ${skills[0] || "technical"} skills to design and deliver course projects for real-world use cases.`,
    "Collaborated with student teams to define requirements, test solutions, and present project outcomes.",
    "Translated complex technical work into concise documentation and measurable resume achievements.",
  ];

  bulletContent.forEach((item) => {
    const bullet = document.createElement("li");
    bullet.textContent = item;
    bullets.append(bullet);
  });

  const exportActions = document.createElement("div");
  exportActions.className = "resume-export-actions";

  const exportButton = document.createElement("button");
  exportButton.className = "export-pdf-button";
  exportButton.type = "button";
  exportButton.textContent = "Export as PDF";
  exportButton.addEventListener("click", () => {
    exportResumeAsPdf(skills, summary.textContent, bulletContent);
  });
  exportActions.append(exportButton);

  draft.append(
    name,
    subtitle,
    summaryHeading,
    summary,
    experienceHeading,
    bullets,
    exportActions,
  );
  content.append(author, intro, draft);
  message.append(avatar, content);
  conversation.append(message);
  conversation.scrollTop = conversation.scrollHeight;
}

skillInputs.forEach((input) => {
  input.addEventListener("change", updateSkillCount);
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    promptInput.value = button.dataset.prompt;
    promptInput.focus();
  });
});

promptForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const prompt = promptInput.value.trim();

  if (!prompt) {
    promptInput.focus();
    return;
  }

  const submitButton = promptForm.querySelector('button[type="submit"]');
  addUserMessage(prompt);
  promptInput.value = "";
  submitButton.disabled = true;
  submitButton.firstChild.textContent = "Generating... ";

  window.setTimeout(() => {
    addAssistantDraft(getSelectedSkills());
    submitButton.disabled = false;
    submitButton.firstChild.textContent = "Generate resume ";
  }, 650);
});

newChatButton.addEventListener("click", () => {
  conversation.innerHTML = initialConversation;
  promptInput.value = "";
  promptInput.focus();

  conversation.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      promptInput.value = button.dataset.prompt;
      promptInput.focus();
    });
  });
});

updateSkillCount();
