async function load(file) {
  try {
    const res = await fetch(file);
    if (!res.ok) return {};
    return await res.json();
  } catch (err) {
    console.error(`Error loading ${file}:`, err);
    return {};
  }
}

function cleanDescription(text) {
  if (!text) return "";
  return text.replace(/https?:\/\/\S+/g, "").trim();
}

function uniqueLinks(item) {
  const links = [];
  const seen = new Set();

  if (item.links && Array.isArray(item.links)) {
    item.links.forEach(link => {
      if (link.url && !seen.has(link.url)) {
        links.push(link);
        seen.add(link.url);
      }
    });
  }

  if (item.link && !seen.has(item.link)) {
    links.push({ label: "Open Link", url: item.link, highlight: true });
  }

  return links;
}

function parseMeetingDate(item) {
  const text = `${item.month || ""} ${item.date || ""} at ${item.time || ""}`;
  const year = new Date().getFullYear();

  const fallback = (item.description || "").match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\s+at\s+(\d{1,2})(?::(\d{2}))?/i
  );

  if (!fallback) return null;

  const monthName = fallback[1];
  const day = parseInt(fallback[2], 10);
  let hour = parseInt(fallback[3], 10);
  const minute = fallback[4] ? parseInt(fallback[4], 10) : 0;

  const months = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };

  if (hour < 12) hour += 12;

  const start = new Date(year, months[monthName.toLowerCase()], day, hour, minute);
  const end = new Date(start.getTime() + 90 * 60 * 1000);

  return { start, end };
}

function formatCalendarDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function createCalendarLinks(item) {
  const parsed = parseMeetingDate(item);
  if (!parsed) return "";

  const details = [
    item.speaker ? `Speaker: ${item.speaker}` : "",
    item.topic ? `Topic: ${item.topic}` : "",
    item.location ? `Location: ${item.location}` : ""
  ].filter(Boolean).join(" | ");

  const title = encodeURIComponent(item.topic || item.title || "CASSUG Meeting");
  const encodedDetails = encodeURIComponent(details || item.description || "");
  const location = encodeURIComponent(item.location || "Troy Web Consulting, 135 Mohawk St, Cohoes, NY 12047");
  const start = formatCalendarDate(parsed.start);
  const end = formatCalendarDate(parsed.end);

  const googleUrl =
    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${encodedDetails}&location=${location}`;

  const outlookUrl =
    `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${parsed.start.toISOString()}&enddt=${parsed.end.toISOString()}&body=${encodedDetails}&location=${location}`;

  const yahooUrl =
    `https://calendar.yahoo.com/?v=60&title=${title}&st=${start}&et=${end}&desc=${encodedDetails}&in_loc=${location}`;

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CASSUG//Meeting Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@cassug`,
    `DTSTAMP:${formatCalendarDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${item.topic || item.title || "CASSUG Meeting"}`,
    `DESCRIPTION:${details || item.description || ""}`,
    `LOCATION:${item.location || "Troy Web Consulting, 135 Mohawk St, Cohoes, NY 12047"}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\n");

  const icsUrl = "data:text/calendar;charset=utf8," + encodeURIComponent(icsContent);

  return `
    <div class="calendar-links">
      <a class="calendar-btn google" href="${googleUrl}" target="_blank">Google Calendar</a>
      <a class="calendar-btn outlook" href="${outlookUrl}" target="_blank">Outlook</a>
      <a class="calendar-btn yahoo" href="${yahooUrl}" target="_blank">Yahoo</a>
      <a class="calendar-btn apple" href="${icsUrl}" download="${item.title || "cassug-meeting"}.ics">Apple / iCloud</a>
    </div>
  `;
}

function renderMeetingCard(meeting) {
  const links = uniqueLinks(meeting);
  const linksHtml = links.map(link => {
    const className = link.highlight ? "highlight-link" : "";
    return `<a class="${className}" href="${link.url}" target="_blank">${link.label || "Open Link"}</a>`;
  }).join(" ");

  const hasDetails =
    meeting.date || meeting.time || meeting.location || meeting.speaker || meeting.topic;

  const fallbackText = cleanDescription(meeting.description || meeting.raw_text || "");

  return `
    <div class="meeting-card">
      <h4>${meeting.title || "Meeting"}</h4>

      ${
        hasDetails
          ? `
            <div class="meeting-details">
              ${meeting.date ? `<p><strong>Date:</strong> ${meeting.date}</p>` : ""}
              ${meeting.time ? `<p><strong>Time:</strong> ${meeting.time}</p>` : ""}
              ${meeting.location ? `<p><strong>Location:</strong> ${meeting.location}</p>` : ""}
              ${meeting.speaker ? `<p><strong>Speaker:</strong> ${meeting.speaker}</p>` : ""}
              ${meeting.topic ? `<p><strong>Topic:</strong> ${meeting.topic}</p>` : ""}
            </div>
          `
          : `<p>${fallbackText}</p>`
      }

      <div class="links">${linksHtml}</div>
      ${createCalendarLinks(meeting)}
    </div>
  `;
}

function render(items, id) {
  const container = document.getElementById(id);
  if (!container) return;

  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = "<p>No data available.</p>";
    return;
  }

  if (id === "meetings-list") {
    container.innerHTML = items.map(renderMeetingCard).join("");
    return;
  }

  container.innerHTML = items.map(i => {
    const description = cleanDescription(i.description);
    const links = uniqueLinks(i);

    const linksHtml = links.map(link => {
      const className = link.highlight ? "highlight-link" : "";
      return `<a class="${className}" href="${link.url}" target="_blank">${link.label || "Open Link"}</a>`;
    }).join(" ");

    const mapHtml = i.mapEmbed
      ? `<div class="map-box"><iframe src="${i.mapEmbed}" loading="lazy" allowfullscreen></iframe></div>`
      : "";

    return `
      <div class="item">
        <h4>${i.title || "No Title"}</h4>
        <p>${description}</p>
        <div class="links">${linksHtml}</div>
        ${mapHtml}
      </div>
    `;
  }).join("");
}

function renderCards(items, id, fallbackText = "No resources available.") {
  const container = document.getElementById(id);
  if (!container) return;

  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = `<p>${fallbackText}</p>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="resource-card">
      <h4>${item.title || "No Title"}</h4>
      <p>${item.description || ""}</p>
      <a class="highlight-link" href="${item.link}" target="_blank">Open Resource</a>
    </div>
  `).join("");
}

function renderCareerCards(items, id) {
  const container = document.getElementById(id);
  if (!container) return;

  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = "<p>No career resources available.</p>";
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="career-card">
      <h4>${item.title || "No Title"}</h4>
      <p>${item.description || ""}</p>
      <a class="highlight-link" href="${item.link}" target="_blank">Open Resource</a>
    </div>
  `).join("");
}

function renderTools(items, id) {
  const container = document.getElementById(id);
  if (!container) return;

  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = "<p>No tools available.</p>";
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="tool-card">
      <h4>${item.title || "No Title"}</h4>
      <p>${item.description || ""}</p>
      <a class="highlight-link" href="${item.link}" target="_blank">Download / Visit</a>
    </div>
  `).join("");
}

function renderHomeDashboard(meetings, announcements, sponsors) {
  const meetingBox = document.getElementById("home-next-meeting");
  const announcementBox = document.getElementById("home-announcement");
  const sponsorBox = document.getElementById("home-sponsor");

  if (meetingBox) {
    if (Array.isArray(meetings) && meetings.length > 0) {
      const meeting = meetings[0];
      meetingBox.innerHTML = `
        <p><strong>${meeting.title || "Upcoming Meeting"}</strong></p>
        ${meeting.date ? `<p><strong>Date:</strong> ${meeting.date}</p>` : ""}
        ${meeting.time ? `<p><strong>Time:</strong> ${meeting.time}</p>` : ""}
        ${meeting.speaker ? `<p><strong>Speaker:</strong> ${meeting.speaker}</p>` : ""}
        ${meeting.topic ? `<p><strong>Topic:</strong> ${meeting.topic}</p>` : ""}
      `;
    } else {
      meetingBox.innerHTML = "<p>No meeting listed yet.</p>";
    }
  }

  if (announcementBox) {
    if (Array.isArray(announcements) && announcements.length > 0) {
      const announcement = announcements[0];
      announcementBox.innerHTML = `
        <p><strong>${announcement.title || "Announcement"}</strong></p>
        <p>${cleanDescription(announcement.description)}</p>
      `;
    } else {
      announcementBox.innerHTML = "<p>No announcements listed yet.</p>";
    }
  }

  if (sponsorBox) {
    if (Array.isArray(sponsors) && sponsors.length > 0) {
      const sponsor = sponsors[0];
      sponsorBox.innerHTML = `
        <p><strong>${sponsor.title || "Sponsor"}</strong></p>
        <p>${sponsor.description || ""}</p>
      `;
    } else {
      sponsorBox.innerHTML = "<p>No sponsor listed yet.</p>";
    }
  }
}

async function loadLiveJobs() {
  const keyword = document.getElementById("job-keyword").value;
  const location = document.getElementById("job-location").value;
  const container = document.getElementById("live-jobs-list");

  container.innerHTML = "<p>Loading jobs...</p>";

  try {
    const url = `/live-jobs?keyword=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.message) {
      container.innerHTML = `<p>${data.message}</p>`;
      return;
    }

    if (!data.jobs || data.jobs.length === 0) {
      container.innerHTML = "<p>No jobs found.</p>";
      return;
    }

    container.innerHTML = data.jobs.map(job => `
      <div class="job-card">
        <h4>${job.title}</h4>
        <p><strong>Company:</strong> ${job.company}</p>
        <p><strong>Location:</strong> ${job.location}</p>
        <p><strong>Source:</strong> ${job.source}</p>
        <p>${job.description}</p>
        <a class="highlight-link" href="${job.link}" target="_blank">Apply / View Job</a>
      </div>
    `).join("");

  } catch (error) {
    console.error(error);
    container.innerHTML = "<p>Could not load live jobs.</p>";
  }
}

function showTab(tabId, button) {
  document.querySelectorAll(".tab-content").forEach(section => {
    section.classList.remove("active-content");
  });

  const selected = document.getElementById(tabId);
  if (selected) selected.classList.add("active-content");

  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.remove("active");
  });

  if (button) button.classList.add("active");
}

function showTabById(tabId) {
  const button = document.querySelector(`button[onclick*="'${tabId}'"]`);
  showTab(tabId, button);
}

async function init() {
  const sponsors = await load("data/sponsors.json");
  const announcements = await load("data/announcements.json");
  const meetings = await load("data/meetings.json");

  renderHomeDashboard(meetings, announcements, sponsors);

  render(sponsors, "sponsors-list");
  render(announcements, "announcements-list");
  render(meetings, "meetings-list");
  render(await load("data/virtual-events.json"), "virtual-events");
  render(await load("data/virtual-user-groups.json"), "virtual-groups");
  render(await load("data/in-person-events.json"), "in-person-events");
  render(await load("data/paid-events.json"), "paid-events");
  render(await load("data/jobs.json"), "jobs-list");
  render(await load("data/archive.json"), "archive-list");

  const resources = await load("data/resources.json");
  renderCards(resources.articles, "articles-list");
  renderCards(resources.repos, "repos-list");
  renderCards(resources.videos, "videos-list");

  const resume = await load("data/resume.json");
  renderCareerCards(resume.templates, "resume-templates");
  renderCareerCards(resume.examples, "resume-examples");
  renderCareerCards(resume.tips, "resume-tips");
  renderCareerCards(resume.tools, "resume-tools");

  renderCareerCards(resources.interview, "interview-list");

  const tools = await load("data/tools.json");
  renderTools(tools.databases, "tools-databases");
  renderTools(tools.data_engineering, "tools-engineering");
  renderTools(tools.data_science, "tools-science");
  renderTools(tools.bi_tools, "tools-bi");
}

init();