import { Game } from "./components/Game";
import "./App.css";

export function App() {
  return (
    <main className="app">
      <header className="title">
        <h1>BLACK BLADE</h1>
        <span>A side-scrolling brawler</span>
      </header>
      <Game />
    </main>
  );
}
