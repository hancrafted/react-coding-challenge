import ReactDOM from "react-dom";

import App from "./App";
import "./styles.css";

const rootElement = document.getElementById("root");

const render = (App: any) => ReactDOM.render(<App />, rootElement);

render(App);
