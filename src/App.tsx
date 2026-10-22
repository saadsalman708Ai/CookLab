import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="container">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <p className="eyebrow">COOKLAB DESKTOP</p>
        <h1 id="welcome-title">Welcome to CookLab</h1>
        <p className="intro">
          A focused starting point for your next video project.
        </p>

        <form
          className="greeting-form"
          onSubmit={(e) => {
            e.preventDefault();
            greet();
          }}
        >
          <label htmlFor="greet-input">Try the desktop connection</label>
          <div className="greeting-controls">
            <input
              id="greet-input"
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Enter your name"
            />
            <button type="submit">Greet</button>
          </div>
        </form>
        <p className="greeting-message" aria-live="polite">
          {greetMsg}
        </p>
      </section>
    </main>
  );
}

export default App;
