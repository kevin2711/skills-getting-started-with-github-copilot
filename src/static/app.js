document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: produce initials from a name or email
  function getInitials(text) {
    if (!text) return "";
    const cleaned = String(text).trim();
    // if email, take local part
    const local = cleaned.includes("@") ? cleaned.split("@")[0] : cleaned;
    const parts = local.split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Helper: simple escape to avoid injecting markup
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const participants = Array.isArray(details.participants) ? details.participants : [];
        const spotsLeft = details.max_participants - participants.length;

        // Build participants HTML
        let participantsHtml = "";
        if (participants.length > 0) {
          const items = participants
              .map((p) => {
                const display = typeof p === "string" ? p : p.name || p.email || "";
                const initials = getInitials(display || p);
                // include a delete button with data attributes for activity and email
                return `<li><span class="participant-badge">${escapeHtml(initials)}</span><span class="participant-name">${escapeHtml(display)}</span><button class="participant-delete" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(display)}" title="Unregister">🗑️</button></li>`;
              })
              .join("");
          participantsHtml = `
            <div class="participants">
              <h5>Participants</h5>
              <ul>${items}</ul>
            </div>
          `;
        } else {
          participantsHtml = `
            <div class="participants">
              <h5>Participants</h5>
              <div class="empty">No participants yet</div>
            </div>
          `;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${escapeHtml(String(spotsLeft))} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
    // refresh activities only on successful signup and then reload the page
    if (response && response.ok) {
      try {
        // try to refresh the activities list first
        await fetchActivities();
      } catch (e) {
        // ignore fetch errors, we'll still reload
        console.error('Error refreshing activities after signup:', e);
      }

      // give a short moment for the success message to be visible, then reload
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  });

  // Delegate click handler for participant delete buttons
  activitiesList.addEventListener("click", async (event) => {
    const btn = event.target.closest && event.target.closest('.participant-delete');
    if (!btn) return;

    const activity = btn.getAttribute('data-activity');
    const email = btn.getAttribute('data-email');

    if (!activity || !email) return;

    if (!confirm(`Unregister ${email} from ${activity}?`)) return;

    try {
      const res = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });

      const result = await res.json();
      if (res.ok) {
        // refresh list
        fetchActivities();
      } else {
        alert(result.detail || 'Failed to unregister participant');
      }
    } catch (err) {
      console.error('Error unregistering participant:', err);
      alert('Failed to unregister participant');
    }
  });

  // Initialize app
  fetchActivities();
});
