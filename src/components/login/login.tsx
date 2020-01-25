import { Button, Classes, InputGroup } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { Form } from "antd";
import { FormComponentProps } from "antd/lib/form/Form";
import * as React from "react";
import { connect } from "react-redux";
import { Redirect, RouteComponentProps } from "react-router";
import { NavLink } from "react-router-dom";
import * as actions from "../../store/actions/auth";
import "./login.scss";
interface LoginFormProps {
  loading: boolean;
  error: string;
  token: string;
  onAuth(username: string, password: string): any;
}
class NormalLoginForm extends React.Component<
  LoginFormProps & FormComponentProps & RouteComponentProps
> {
  handleSubmit = (e: any) => {
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        this.props.onAuth(values.username, values.password);
        //   if (this.props.token !== undefined) {
        //     console.log(this.props.token);

        //   }
        // console.log(this.props.loading);
        // while (this.props.loading) {
        //   console.log("Wait for login");
        // }
        // console.log("login_finished");
        // console.log(this.props.token);
        // if (this.props.token !== null) {
        //   this.props.history.push("/");
        // }
      }
    });
  };

  render() {
    const { getFieldDecorator } = this.props.form;

    return this.props.token !== null ? (
      <Redirect to="/" />
    ) : (
      <div className={Classes.DARK + " login-container"}>
        <Form
          onSubmit={this.handleSubmit}
          className="login-form .bp3-form-group"
        >
          <h2>Login</h2>
          <Form.Item>
            {getFieldDecorator("username", {
              rules: [
                { required: true, message: "Please input your username!" }
              ]
            })(<InputGroup id="username" placeholder="username" />)}
          </Form.Item>
          <Form.Item>
            {getFieldDecorator("password", {
              rules: [
                { required: true, message: "Please input your Password!" }
              ]
            })(
              <InputGroup
                type="password"
                id="password"
                placeholder="password"
              />
            )}
          </Form.Item>
          <Form.Item>
            <Button className="login-button" type="submit">
              Login
            </Button>
            <p></p>
            <NavLink to="/register">Create an account</NavLink>
          </Form.Item>
        </Form>
        {this.props.loading ? <p>loading</p> : <p></p>}
      </div>
    );
  }
}
const mapStatetoProps = (state: any) => {
  return {
    loading: state.loading,
    error: state.error,
    token: state.token
  };
};
const WrappedNormalLoginForm = Form.create({ name: "normal_login" })(
  NormalLoginForm
);
const mapDispatchToProps = (dispatch: any) => {
  return {
    onAuth: (username: string, password: string) =>
      dispatch(actions.authLogin(username, password))
  };
};
export default connect(
  mapStatetoProps,
  mapDispatchToProps
)(WrappedNormalLoginForm);
