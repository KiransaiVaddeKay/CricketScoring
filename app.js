const state = {
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
  nextBatter: 3,
};

const el = {
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
  currentOver: document.querySelector("#currentOver"),
  scoreLog: document.querySelector("#scoreLog"),
  ballsLeft: document.querySelector("#ballsLeft"),
  inningsSummary: document.querySelector("#inningsSummary"),
  nameDialog: document.querySelector("#nameDialog"),
  newBatterName: document.querySelector("#newBatterName"),
};

let pendingWicket = false;
let pendingOutIndex = null;

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

function maxWickets() {
  return Math.max(1, Number(el.playersLimit.value) - 1);
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

function scoreRuns(runs) {
  if (isInningsOver() || checkChaseComplete()) return;
  pushHistory();

  const batter = currentBatter();
  state.runs += runs;
  state.legalBalls += 1;
  batter.runs += runs;
  batter.balls += 1;
  addBall(String(runs));
  addLog(`${formatOvers()} ${batter.name} scored ${runs}`, String(runs));

  if (runs % 2 === 1) swapStrike();
  if (state.legalBalls % 6 === 0) swapStrike();
  render();
}

function scoreExtra(type) {
  if (isInningsOver() || checkChaseComplete()) return;
  pushHistory();

  const labels = {
    wide: "Wide",
    noBall: "No ball",
    bye: "Bye",
    legBye: "Leg bye",
  };
  const legal = type === "bye" || type === "legBye";
  state.runs += 1;
  if (legal) state.legalBalls += 1;
  addBall(labels[type].slice(0, 2), { legal });
  addLog(`${formatOvers()} ${labels[type]} +1`, labels[type].slice(0, 2));

  if (legal) {
    swapStrike();
    if (state.legalBalls % 6 === 0) swapStrike();
  }
  render();
}

function wicket() {
  if (isInningsOver() || checkChaseComplete()) return;
  pushHistory();

  const batter = currentBatter();
  const outIndex = state.striker;
  state.wickets += 1;
  state.legalBalls += 1;
  batter.balls += 1;
  batter.out = true;
  addBall("W", { wicket: true });
  addLog(`${formatOvers()} ${batter.name} is out`, "W");

  if (!isInningsOver()) {
    pendingWicket = true;
    pendingOutIndex = outIndex;
    el.newBatterName.value = `Batter ${state.nextBatter}`;
    el.nameDialog.showModal();
  }

  if (state.legalBalls % 6 === 0) swapStrike();
  render();
}

function retireBatter() {
  if (isInningsOver() || checkChaseComplete()) return;
  pushHistory();
  pendingWicket = true;
  pendingOutIndex = state.striker;
  addLog(`${formatOvers()} ${currentBatter().name} retired`, "R");
  el.newBatterName.value = `Batter ${state.nextBatter}`;
  el.nameDialog.showModal();
}

function saveNewBatter() {
  if (!pendingWicket) return;
  const name = el.newBatterName.value.trim() || `Batter ${state.nextBatter}`;
  const index = state.batters.push({ name, runs: 0, balls: 0, out: false }) - 1;
  if (state.striker === pendingOutIndex) {
    state.striker = index;
  } else {
    state.nonStriker = index;
  }
  state.nextBatter += 1;
  pendingWicket = false;
  pendingOutIndex = null;
  render();
}

function endInnings() {
  pushHistory();
  if (state.innings === 1) {
    const target = state.runs + 1;
    Object.assign(state, {
      innings: 2,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      target,
      balls: [],
      log: [{ text: `Target set: ${target}`, mark: "T" }, ...state.log],
      batters: [
        { name: "Batter 1", runs: 0, balls: 0, out: false },
        { name: "Batter 2", runs: 0, balls: 0, out: false },
      ],
      striker: 0,
      nonStriker: 1,
      nextBatter: 3,
    });
    el.battingTeam.value = "Team B";
  } else {
    addLog("Match ended", "End");
  }
  render();
}

function resetMatch() {
  const overs = el.oversLimit.value;
  const players = el.playersLimit.value;
  Object.assign(state, {
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
    nextBatter: 3,
  });
  el.battingTeam.value = "Team A";
  el.oversLimit.value = overs;
  el.playersLimit.value = players;
  render();
}

function undo() {
  const snapshot = state.history.pop();
  if (!snapshot) return;
  pendingWicket = false;
  pendingOutIndex = null;
  restoreState(snapshot);
  render();
}

function syncNames() {
  currentBatter().name = el.strikerName.value.trim() || "Striker";
  otherBatter().name = el.nonStrikerName.value.trim() || "Non-striker";
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
  const ballsRemaining = Math.max(0, inningsBallsLimit() - state.legalBalls);
  const legalThisOver = state.legalBalls % 6;
  const rr = state.legalBalls ? (state.runs / state.legalBalls) * 6 : 0;
  const striker = currentBatter();
  const nonStriker = otherBatter();

  el.inningsBadge.textContent = state.innings === 1 ? "1st innings" : "2nd innings";
  el.runs.textContent = state.runs;
  el.wickets.textContent = state.wickets;
  el.overs.textContent = formatOvers();
  el.runRate.textContent = rr.toFixed(2);
  if (!state.target) {
    el.targetText.textContent = "Set a target";
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
  el.ballsLeft.textContent = `${isInningsOver() ? 0 : 6 - legalThisOver} balls left`;
  el.inningsSummary.textContent = `${state.runs}/${state.wickets} in ${formatOvers()} overs`;

  renderOver();
  renderLog();
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
document.querySelector("#resetMatch").addEventListener("click", resetMatch);
document.querySelector("#swapStrike").addEventListener("click", () => {
  pushHistory();
  swapStrike();
  render();
});
document.querySelector("#confirmBatter").addEventListener("click", saveNewBatter);
el.strikerName.addEventListener("change", syncNames);
el.nonStrikerName.addEventListener("change", syncNames);
el.oversLimit.addEventListener("change", render);
el.playersLimit.addEventListener("change", render);

render();
