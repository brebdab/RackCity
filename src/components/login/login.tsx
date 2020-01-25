import * as React from "react";
import { InputGroup, FormGroup, Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
export interface LoginViewState {
  username: string;
  password: string;
}
function handleSubmit() {}

export class LoginView extends React.PureComponent<LoginViewState> {
  state: LoginViewState = {
    username: "",
    password: ""
  };

  public render() {
    return (
      <form onSubmit={handleSubmit}>
        <FormGroup className={Classes.DARK} label="Login">
          <InputGroup id="username" placeholder="username" />
          <InputGroup id="passowrd" placeholder="password" />
        </FormGroup>
      </form>
    );
  }
}

export default LoginView;
