import {
  Button,
  Classes,
  InputGroup,
  Callout,
  Intent,
  Spinner
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { Form } from "antd";
import { FormComponentProps } from "antd/lib/form/Form";
import * as React from "react";
import { connect } from "react-redux";
import { Redirect, RouteComponentProps } from "react-router";
import * as actions from "../../store/actions/state";
import "./login.scss";
interface LoginFormProps {
  loading: boolean;
  error: any;
  token: string;
  onAuth(username: string, password: string): any;
}
var console: any = {};
console.log = function() {};
class NormalLoginForm extends React.Component<
  LoginFormProps & FormComponentProps & RouteComponentProps
> {
  handleSubmit = (e: any) => {
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        this.props.onAuth(values.username, values.password);
      }
    });
  };

  render() {
    const { getFieldDecorator } = this.props.form;

    return (
      <div>
        {this.props.error ? (
          <Callout className={Classes.DARK} intent={Intent.DANGER}>
            {this.props.error.response.data.non_field_errors
              ? this.props.error.response.data.non_field_errors.toString()
              : ""}
          </Callout>
        ) : null}

        {this.props.token !== null ? (
          <Redirect to="/" />
        ) : (
          <div className={Classes.DARK + " login-container"}>
            <Form
              onSubmit={this.handleSubmit}
              className="login-form .bp3-form-group"
            >
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
              </Form.Item>
            </Form>
            {this.props.loading ? (
              <Spinner size={Spinner.SIZE_STANDARD} />
            ) : null}
          </div>
        )}
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
