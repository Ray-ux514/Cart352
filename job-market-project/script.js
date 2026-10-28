const startButton = document.getElementById("startButton");
const occupationSelect = document.getElementById("occupation");
const message = document.getElementById("message");

startButton.addEventListener("click", function () {
  const occupation = occupationSelect.value;

  if (occupation === "") {
    message.textContent = "Please select an occupation first.";
  } else {
    const selectedJob =
      occupationSelect.options[occupationSelect.selectedIndex].text;

    message.textContent =
      "You selected " + selectedJob + ". Simulation coming soon!";
  }
});
