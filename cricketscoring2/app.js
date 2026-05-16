const state = {
  matchStarted: false,
  matchComplete: false,
  innings: 1,
  runs: 0,
  wickets: 0,
  legalBalls: 0,
  target: null,
  balls: [],
  log: [],
  history: [],
  teams: [
    { name: "Team A", players: [] },
    { name: "Team B", players: [] },
  ],
  battingTeamIndex: 0,
  bowlingTeamIndex: 1,
  batters: [
    { name: "Batter 1", runs: 0, balls: 0, out: false },
    { name: "Batter 2", runs: 0, balls: 0, out: false },
  ],
  striker: 0,
  nonStriker: 1,
  bowler: "Bowler 1",
  currentOverBowlerBalls: 0,
  firstInningsScore: null,
};

const el = {
  setupPanel: document.querySelector("#setupPanel"),
  teamAName: document.querySelector("#teamAName"),
  teamBName: document.querySelector("#teamBName"),
  teamAPlayers: document.querySelector("#teamAPlayers"),
  teamBPlayers: document.querySelector("#teamBPlayers"),
  batFirstTeam: document.querySelector("#batFirstTeam"),
  setupStriker: document.querySelector("#setupStriker"),
  setupNonStriker: document.querySelector("#setupNonStriker"),
  setupBowler: document.querySelector("#setupBowler"),
  startFirstInnings: document.querySelector("#startFirstInnings"),
  battingTeam: document.querySelector("#battingTeam"),
  inningsBadge: document.querySelector("#inningsBadge"),
  runs: document.querySelector("#runs"),
  wickets: document.querySelector("#wickets"),
  overs: document.querySelector("#overs"),
  runRate: document.querySelector("#runRate"),
  targetText: document.querySelector("#targetText"),
  oversLimit: document.querySelector("#oversLimit"),
  playersLimit: document.querySelector("#playersLimit"),
  strikerName: document.querySelector("#strikerName"),
  nonStrikerName: document.querySelector("#nonStrikerName"),
  strikerRuns: document.querySelector("#strikerRuns"),
  strikerBalls: document.querySelector("#strikerBalls"),
  nonStrikerRuns: document.querySelector("#nonStrikerRuns"),
  nonStrikerBalls: document.querySelector("#nonStrikerBalls"),
  bowlerName: document.querySelector("#bowlerName"),
  bowlerBalls: document.querySelector("#bowlerBalls"),
  currentOver: document.querySelector("#currentOver"),
  scoreLog: document.querySelector("#scoreLog"),
  ballsLeft: document.querySelector("#ballsLeft"),
  inningsSummary: document.querySelector("#inningsSummary"),
  nameDialog: document.querySelector("#nameDialog"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogLabel: document.querySelector("#dialogLabel"),
  playerSelect: document.querySelector("#playerSelect"),
  newBatterName: document.querySelector("#newBatterName"),
  scoreModeHint: document.querySelector("#scoreModeHint"),
};

let pendingWicket = false;
let pendingOutIndex = null;
let scoreMode = "normal";
let pendingSelection = null;
let secondInningsSetup = null;

function cloneState() {
  const { history, ...matchState } = state;
  return JSON.parse(JSON.stringify(matchState));
}

function restoreState(snapshot) {
  const history = state.history;
  Object.keys(state).forEach((key) => {
    if (key !== "history") state[key] = snapshot[key];
  });
  state.history = history;
}

function pushHistory() {
  state.history.push(cloneState());
  if (state.history.length > 80) state.history.shift();
}

function parsePlayers(value) {
  return value
    .split(/[\n,]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function setupTeamsFromInputs() {
  state.teams = [
    {
      name: el.teamAName.value.trim() || "Team A",
      players: parsePlayers(el.teamAPlayers.value),
    },
    {
      name: el.teamBName.value.trim() || "Team B",
      players: parsePlayers(el.teamBPlayers.value),
    },
  ];
}

function battingPlayers() {
  return state.teams[state.battingTeamIndex].players;
}

function bowlingPlayers() {
  return state.teams[state.bowlingTeamIndex].players;
}

function populateSelect(select, players, selectedValue) {
  const current = selectedValue || select.value;
  select.innerHTML = "";
  players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player;
    option.textContent = player;
    select.appendChild(option);
  });
  if (players.includes(current)) select.value = current;
}

function refreshSetupSelectors() {
  setupTeamsFromInputs();
  const currentBatFirst = el.batFirstTeam.value || "0";
  el.batFirstTeam.innerHTML = "";
  state.teams.forEach((team, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = team.name;
    el.batFirstTeam.appendChild(option);
  });
  el.batFirstTeam.value = currentBatFirst;

  const battingIndex = Number(el.batFirstTeam.value || 0);
  const bowlingIndex = battingIndex === 0 ? 1 : 0;
  populateSelect(el.setupStriker, state.teams[battingIndex].players);
  populateSelect(el.setupNonStriker, state.teams[battingIndex].players, el.setupNonStriker.value || state.teams[battingIndex].players[1]);
  populateSelect(el.setupBowler, state.teams[bowlingIndex].players);
}

function startFirstInnings() {
  refreshSetupSelectors();
  const battingIndex = Number(el.batFirstTeam.value || 0);
  const bowlingIndex = battingIndex === 0 ? 1 : 0;
  const batting = state.teams[battingIndex].players;
  const bowling = state.teams[bowlingIndex].players;
  if (batting.length < 2 || bowling.length < 1) {
    alert("Add at least two batting players and one bowler.");
    return;
  }
  if (el.setupStriker.value === el.setupNonStriker.value) {
    alert("Choose two different opening batters.");
    return;
  }

  Object.assign(state, {
    matchStarted: true,
    matchComplete: false,
    innings: 1,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    target: null,
    balls: [],
    log: [],
    history: [],
    battingTeamIndex: battingIndex,
    bowlingTeamIndex: bowlingIndex,
    batters: [
      { name: el.setupStriker.value, runs: 0, balls: 0, out: false },
      { name: el.setupNonStriker.value, runs: 0, balls: 0, out: false },
    ],
    striker: 0,
    nonStriker: 1,
    bowler: el.setupBowler.value || bowling[0],
    currentOverBowlerBalls: 0,
    firstInningsScore: null,
  });
  el.battingTeam.value = state.teams[state.battingTeamIndex].name;
  setScoreMode("normal");
  render();
}

function maxWickets() {
  const selectedPlayers = battingPlayers().length || Number(el.playersLimit.value);
  return Math.max(1, Math.min(Number(el.playersLimit.value), selectedPlayers) - 1);
}

function inningsBallsLimit() {
  return Number(el.oversLimit.value) * 6;
}

function formatOvers(balls = state.legalBalls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function currentBatter() {
  return state.batters[state.striker];
}

function otherBatter() {
  return state.batters[state.nonStriker];
}

function swapStrike() {
  [state.striker, state.nonStriker] = [state.nonStriker, state.striker];
}

function addLog(text, mark) {
  state.log.unshift({ text, mark });
  state.log = state.log.slice(0, 60);
}

function addBall(mark, options = {}) {
  state.balls.push({
    mark,
    legal: options.legal ?? true,
    wicket: Boolean(options.wicket),
    boundary: mark === "4" || mark === "6",
  });
}

function isInningsOver() {
  return state.wickets >= maxWickets() || state.legalBalls >= inningsBallsLimit();
}

function checkChaseComplete() {
  return state.target && state.runs >= state.target;
}

function canScore() {
  return state.matchStarted && !state.matchComplete && !isInningsOver() && !checkChaseComplete();
}

function legalDeliveryComplete() {
  state.currentOverBowlerBalls += 1;
}

function afterDelivery() {
  if (pendingSelection) return;
  if (checkChaseComplete()) {
    state.matchComplete = true;
    addLog(`${state.teams[state.battingTeamIndex].name} completed the chase`, "End");
    return;
  }
  if (isInningsOver()) return;
  if (state.legalBalls > 0 && state.legalBalls % 6 === 0) {
    promptBowler();
  }
}

function playersAlreadyBatting() {
  return new Set(state.batters.map((batter) => batter.name));
}

function availableNextBatters() {
  const used = playersAlreadyBatting();
  return battingPlayers().filter((player) => !used.has(player));
}

function openPlayerDialog({ title, label, players, type }) {
  pendingSelection = type;
  el.dialogTitle.textContent = title;
  el.dialogLabel.textContent = label;
  el.playerSelect.innerHTML = "";
  players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player;
    option.textContent = player;
    el.playerSelect.appendChild(option);
  });
  el.nameDialog.showModal();
}

function promptNextBatter() {
  const players = availableNextBatters();
  if (!players.length) return;
  openPlayerDialog({
    title: "Next batter",
    label: "Select next batter",
    players,
    type: "batter",
  });
}

function promptBowler() {
  openPlayerDialog({
    title: "New over",
    label: "Select bowler",
    players: bowlingPlayers(),
    type: "bowler",
  });
}

function beginSecondInningsSelection(target) {
  secondInningsSetup = {
    target,
    battingTeamIndex: state.bowlingTeamIndex,
    bowlingTeamIndex: state.battingTeamIndex,
    striker: "",
    nonStriker: "",
    bowler: "",
  };
  openPlayerDialog({
    title: "Start 2nd innings",
    label: "Select striker",
    players: state.teams[secondInningsSetup.battingTeamIndex].players,
    type: "secondStriker",
  });
}

function startSecondInnings() {
  const nextBatters = state.teams[secondInningsSetup.battingTeamIndex].players;
  const nextBowlers = state.teams[secondInningsSetup.bowlingTeamIndex].players;
  const striker = secondInningsSetup.striker || nextBatters[0] || "Batter 1";
  const nonStriker = secondInningsSetup.nonStriker || nextBatters.find((player) => player !== striker) || "Batter 2";
  const bowler = secondInningsSetup.bowler || nextBowlers[0] || "Bowler 1";
  Object.assign(state, {
    innings: 2,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    target: secondInningsSetup.target,
    balls: [],
    log: [{ text: `Target set: ${secondInningsSetup.target}`, mark: "T" }, ...state.log],
    batters: [
      { name: striker, runs: 0, balls: 0, out: false },
      { name: nonStriker, runs: 0, balls: 0, out: false },
    ],
    striker: 0,
    nonStriker: 1,
    battingTeamIndex: secondInningsSetup.battingTeamIndex,
    bowlingTeamIndex: secondInningsSetup.bowlingTeamIndex,
    bowler,
    currentOverBowlerBalls: 0,
    firstInningsScore: secondInningsSetup.target - 1,
  });
  secondInningsSetup = null;
  el.battingTeam.value = state.teams[state.battingTeamIndex].name;
  setScoreMode("normal");
  render();
}

function scoreRuns(runs) {
  if (scoreMode === "noBall") {
    scoreNoBallRuns(runs);
    return;
  }
  if (!canScore()) return;
  pushHistory();

  const batter = currentBatter();
  state.runs += runs;
  state.legalBalls += 1;
  legalDeliveryComplete();
  batter.runs += runs;
  batter.balls += 1;
  addBall(String(runs));
  addLog(`${formatOvers()} ${batter.name} scored ${runs} off ${state.bowler}`, String(runs));

  if (runs % 2 === 1) swapStrike();
  if (state.legalBalls % 6 === 0) swapStrike();
  afterDelivery();
  render();
}

function scoreExtra(type) {
  if (type === "noBall") {
    if (scoreMode === "noBall") {
      scoreNoBallRuns(0);
    } else {
      setScoreMode("noBall");
    }
    return;
  }
  setScoreMode("normal");

  if (!canScore()) return;
  pushHistory();

  const labels = {
    wide: "Wide",
    noBall: "No ball",
    bye: "Bye",
    legBye: "Leg bye",
  };
  const legal = type === "bye" || type === "legBye";
  state.runs += 1;
  if (legal) {
    state.legalBalls += 1;
    legalDeliveryComplete();
  }
  addBall(labels[type].slice(0, 2), { legal });
  addLog(`${formatOvers()} ${labels[type]} +1 off ${state.bowler}`, labels[type].slice(0, 2));

  if (legal) {
    swapStrike();
    if (state.legalBalls % 6 === 0) swapStrike();
  }
  afterDelivery();
  render();
}

function scoreNoBallRuns(runs) {
  if (!canScore()) return;
  pushHistory();

  const batter = currentBatter();
  const totalRuns = runs + 1;
  state.runs += totalRuns;
  batter.runs += runs;
  addBall(`Nb+${runs}`, { legal: false });
  addLog(`${formatOvers()} No ball + ${runs} to ${batter.name}`, `Nb+${runs}`);

  if (runs % 2 === 1) swapStrike();
  setScoreMode("normal");
  render();
}

function setScoreMode(mode) {
  scoreMode = mode;
  if (!el.scoreModeHint) return;
  const isNoBall = mode === "noBall";
  el.scoreModeHint.textContent = isNoBall ? "No ball selected: tap 0/1/2/3/4/6" : "Normal scoring";
  el.scoreModeHint.classList.toggle("active", isNoBall);
}

function wicket() {
  if (!canScore()) return;
  pushHistory();

  const batter = currentBatter();
  const outIndex = state.striker;
  state.wickets += 1;
  state.legalBalls += 1;
  legalDeliveryComplete();
  batter.balls += 1;
  batter.out = true;
  addBall("W", { wicket: true });
  addLog(`${formatOvers()} ${batter.name} is out off ${state.bowler}`, "W");

  if (!isInningsOver()) {
    pendingWicket = true;
    pendingOutIndex = outIndex;
    promptNextBatter();
  }

  if (state.legalBalls % 6 === 0) swapStrike();
  afterDelivery();
  render();
}

function retireBatter() {
  if (!canScore()) return;
  pushHistory();
  pendingWicket = true;
  pendingOutIndex = state.striker;
  addLog(`${formatOvers()} ${currentBatter().name} retired`, "R");
  promptNextBatter();
}

function saveNewBatter() {
  const selectedPlayer = el.playerSelect.value;
  if (pendingSelection === "secondStriker") {
    secondInningsSetup.striker = selectedPlayer;
    pendingSelection = null;
    setTimeout(() => openPlayerDialog({
      title: "Start 2nd innings",
      label: "Select non-striker",
      players: state.teams[secondInningsSetup.battingTeamIndex].players.filter((player) => player !== selectedPlayer),
      type: "secondNonStriker",
    }));
    return;
  }

  if (pendingSelection === "secondNonStriker") {
    secondInningsSetup.nonStriker = selectedPlayer;
    pendingSelection = null;
    setTimeout(() => openPlayerDialog({
      title: "Start 2nd innings",
      label: "Select opening bowler",
      players: state.teams[secondInningsSetup.bowlingTeamIndex].players,
      type: "secondBowler",
    }));
    return;
  }

  if (pendingSelection === "secondBowler") {
    secondInningsSetup.bowler = selectedPlayer;
    pendingSelection = null;
    startSecondInnings();
    return;
  }

  if (pendingSelection === "bowler") {
    state.bowler = selectedPlayer || state.bowler;
    state.currentOverBowlerBalls = 0;
    pendingSelection = null;
    render();
    return;
  }

  if (pendingSelection === "batter" && pendingWicket) {
    const name = selectedPlayer || availableNextBatters()[0] || "Next batter";
    const index = state.batters.push({ name, runs: 0, balls: 0, out: false }) - 1;
    if (state.striker === pendingOutIndex) {
      state.striker = index;
    } else {
      state.nonStriker = index;
    }
    pendingWicket = false;
    pendingOutIndex = null;
    pendingSelection = null;
    if (!isInningsOver() && state.legalBalls > 0 && state.legalBalls % 6 === 0) {
      setTimeout(promptBowler);
    }
    render();
  }
}

function endInnings() {
  if (!state.matchStarted) {
    startFirstInnings();
    return;
  }
  pushHistory();
  if (state.innings === 1) {
    const target = state.runs + 1;
    beginSecondInningsSelection(target);
  } else {
    state.matchComplete = true;
    addLog("Match ended", "End");
    setScoreMode("normal");
    render();
  }
}

function resetMatch() {
  const overs = el.oversLimit.value;
  const players = el.playersLimit.value;
  setScoreMode("normal");
  pendingSelection = null;
  secondInningsSetup = null;
  pendingWicket = false;
  pendingOutIndex = null;
  Object.assign(state, {
    matchStarted: false,
    matchComplete: false,
    innings: 1,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    target: null,
    balls: [],
    log: [],
    history: [],
    batters: [
      { name: "Batter 1", runs: 0, balls: 0, out: false },
      { name: "Batter 2", runs: 0, balls: 0, out: false },
    ],
    striker: 0,
    nonStriker: 1,
    bowler: "Bowler 1",
    currentOverBowlerBalls: 0,
    firstInningsScore: null,
  });
  refreshSetupSelectors();
  el.battingTeam.value = state.teams[0].name;
  el.oversLimit.value = overs;
  el.playersLimit.value = players;
  render();
}

function undo() {
  const snapshot = state.history.pop();
  if (!snapshot) return;
  pendingWicket = false;
  pendingOutIndex = null;
  setScoreMode("normal");
  restoreState(snapshot);
  render();
}

function syncNames() {
  currentBatter().name = el.strikerName.value.trim() || "Striker";
  otherBatter().name = el.nonStrikerName.value.trim() || "Non-striker";
}

function syncBowlerName() {
  state.bowler = el.bowlerName.value.trim() || "Bowler";
}

function renderOver() {
  const overStart = Math.floor(state.legalBalls / 6) * 6;
  let legalSeen = 0;
  const visibleBalls = [];

  state.balls.forEach((ball) => {
    if (legalSeen >= overStart) visibleBalls.push(ball);
    if (ball.legal) legalSeen += 1;
  });

  el.currentOver.innerHTML = "";
  visibleBalls.slice(-10).forEach((ball) => {
    const pill = document.createElement("span");
    pill.className = `pill${ball.wicket ? " wicket" : ""}${ball.boundary ? " boundary" : ""}`;
    pill.textContent = ball.mark;
    el.currentOver.appendChild(pill);
  });

  if (!visibleBalls.length) {
    const empty = document.createElement("span");
    empty.className = "pill";
    empty.textContent = "Ready";
    el.currentOver.appendChild(empty);
  }
}

function renderLog() {
  el.scoreLog.innerHTML = "";
  state.log.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item.text;
    el.scoreLog.appendChild(li);
  });
}

function render() {
  if (!state.matchStarted) refreshSetupSelectors();
  const ballsRemaining = Math.max(0, inningsBallsLimit() - state.legalBalls);
  const legalThisOver = state.legalBalls % 6;
  const rr = state.legalBalls ? (state.runs / state.legalBalls) * 6 : 0;
  const striker = currentBatter();
  const nonStriker = otherBatter();
  const scoringDisabled = !state.matchStarted || state.matchComplete || isInningsOver() || checkChaseComplete();

  el.setupPanel.style.display = state.matchStarted ? "none" : "";
  el.startFirstInnings.textContent = "Start 1st innings";
  document.querySelector("#endInningsButton").textContent =
    state.innings === 1 && isInningsOver() ? "Start 2nd innings" : state.innings === 1 ? "End innings" : "End match";
  el.inningsBadge.textContent = state.innings === 1 ? "1st innings" : "2nd innings";
  el.runs.textContent = state.runs;
  el.wickets.textContent = state.wickets;
  el.overs.textContent = formatOvers();
  el.runRate.textContent = rr.toFixed(2);
  if (!state.target) {
    el.targetText.textContent = state.matchStarted && isInningsOver() ? "Start 2nd innings" : "Set a target";
  } else if (state.runs >= state.target) {
    el.targetText.textContent = "Chase complete";
  } else if (isInningsOver()) {
    el.targetText.textContent = `${state.target - state.runs} short`;
  } else {
    el.targetText.textContent = `${state.target - state.runs} needed from ${ballsRemaining}`;
  }
  el.strikerName.value = striker.name;
  el.nonStrikerName.value = nonStriker.name;
  el.strikerRuns.textContent = striker.runs;
  el.strikerBalls.textContent = `${striker.balls} balls`;
  el.nonStrikerRuns.textContent = nonStriker.runs;
  el.nonStrikerBalls.textContent = `${nonStriker.balls} balls`;
  el.bowlerName.value = state.bowler;
  el.bowlerBalls.textContent = formatOvers(state.currentOverBowlerBalls);
  el.ballsLeft.textContent = `${isInningsOver() ? 0 : 6 - legalThisOver} balls left`;
  el.inningsSummary.textContent = `${state.runs}/${state.wickets} in ${formatOvers()} overs`;
  el.battingTeam.value = state.teams[state.battingTeamIndex]?.name || el.battingTeam.value;

  renderOver();
  renderLog();

  document.querySelectorAll("[data-score], [data-extra], #wicketButton, #retireButton, #swapStrike").forEach((control) => {
    control.disabled = scoringDisabled;
  });
  document.querySelector("#endInningsButton").disabled = !state.matchStarted || state.matchComplete;
}

document.querySelectorAll("[data-score]").forEach((button) => {
  button.addEventListener("click", () => scoreRuns(Number(button.dataset.score)));
});

document.querySelectorAll("[data-extra]").forEach((button) => {
  button.addEventListener("click", () => scoreExtra(button.dataset.extra));
});

document.querySelectorAll("[data-step-overs]").forEach((button) => {
  button.addEventListener("click", () => {
    el.oversLimit.value = Math.min(50, Math.max(1, Number(el.oversLimit.value) + Number(button.dataset.stepOvers)));
    render();
  });
});

document.querySelectorAll("[data-step-players]").forEach((button) => {
  button.addEventListener("click", () => {
    el.playersLimit.value = Math.min(11, Math.max(2, Number(el.playersLimit.value) + Number(button.dataset.stepPlayers)));
    render();
  });
});

document.querySelector("#wicketButton").addEventListener("click", wicket);
document.querySelector("#retireButton").addEventListener("click", retireBatter);
document.querySelector("#undoButton").addEventListener("click", undo);
document.querySelector("#endInningsButton").addEventListener("click", endInnings);
el.startFirstInnings.addEventListener("click", startFirstInnings);
document.querySelector("#resetMatch").addEventListener("click", resetMatch);
document.querySelector("#swapStrike").addEventListener("click", () => {
  pushHistory();
  swapStrike();
  render();
});
document.querySelector("#confirmBatter").addEventListener("click", saveNewBatter);
el.nameDialog.addEventListener("close", () => {
  if (pendingSelection) saveNewBatter();
});
el.strikerName.addEventListener("change", syncNames);
el.nonStrikerName.addEventListener("change", syncNames);
el.bowlerName.addEventListener("change", syncBowlerName);
el.oversLimit.addEventListener("change", render);
el.playersLimit.addEventListener("change", render);
[el.teamAName, el.teamBName, el.teamAPlayers, el.teamBPlayers, el.batFirstTeam].forEach((input) => {
  input.addEventListener("input", refreshSetupSelectors);
  input.addEventListener("change", refreshSetupSelectors);
});

refreshSetupSelectors();
render();
