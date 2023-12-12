import { useState, useEffect } from "react";
import logo from "./assets/react.svg";

const link = document.createElement("link");
link.setAttribute("rel", "stylesheet");
link.setAttribute("href", "./cssProperties-brand1.css");

const App = () => {
  const [brand, setBrand] = useState("brand1");
  useEffect(() => {
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    link.setAttribute("href", `./cssProperties-${brand}.css`);
  }, [brand]);

  const handleButtonClick = () => {
    setBrand((curr) => (curr === "brand1" ? "brand2" : "brand1"));
  };
  return (
    <div>
      <nav className="px-s py-l flex gap-s transition-all">
        <img className="w-xxl" src={logo} />
        <p className="text-h3 text-primary-400">React!</p>
        <button
          onClick={handleButtonClick}
          className="border-lg rounded-lg ml-auto mr-0 p-xs h-fit"
        >
          Change brand theme
        </button>
      </nav>
      <div className="px-s py-xxl">
        <div className="text-h1">Test app</div>
      </div>
    </div>
  );
};

export default App;
