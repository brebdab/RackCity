import * as React from "react";
import { Form, Icon, Input } from "antd";
import { FormComponentProps } from "antd/lib/form/Form";
import { Button, Classes, Spinner, InputGroup } from "@blueprintjs/core";
import { NavLink } from "react-router-dom";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as actions from "../../store/actions/auth";
interface LoginFormProps {
  loading: boolean;
  error: string;
  onAuth(username: string, password: string): any;
}
class NormalLoginForm extends React.Component<
  LoginFormProps & FormComponentProps & RouteComponentProps
> {
  handleSubmit = (e: any) => {
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        this.props.onAuth(values.userName, values.password);
      }
    });
    this.props.history.push("/");
  };

  render() {
    const { getFieldDecorator } = this.props.form;
    let errorMessage = null;
    if (this.props.error) {
      errorMessage = <p>{this.props.error}</p>;
    }
    return (
      <div className={Classes.DARK}>
        <Form onSubmit={this.handleSubmit} className="login-form">
          <Form.Item>
            {getFieldDecorator("username", {
              rules: [
                { required: true, message: "Please input your username!" }
              ]
            })(
              <InputGroup id="field" placeholder="username" />
              //   <Input
              //     className="field"
              //     prefix={
              //       <Icon type="user" style={{ color: "rgba(0,0,0,.25)" }} />
              //     }
              //     placeholder="Username"
              //   />
            )}
          </Form.Item>
          <Form.Item>
            {getFieldDecorator("password", {
              rules: [
                { required: true, message: "Please input your Password!" }
              ]
            })(
              <InputGroup type="password" id="field" placeholder="password" />
              //   <Input
              //     className="field"
              //     prefix={
              //       <Icon type="lock" style={{ color: "rgba(0,0,0,.25)" }} />
              //     }
              //     type="password"
              //     placeholder="Password"
              //   />
            )}
          </Form.Item>
          <Form.Item>
            <Button className="login-button" type="submit">
              Login
            </Button>
            or
            <NavLink to="/signup/">Sign up!</NavLink>
          </Form.Item>
        </Form>
      </div>
    );
  }
}
const mapStatetoProps = (state: any) => {
  return {
    loading: state.loading,
    error: state.error
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
