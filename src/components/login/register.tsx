import React from "react";
import { Form } from "antd";
import { connect } from "react-redux";
import { NavLink, RouteComponentProps } from "react-router-dom";
import * as actions from "../../store/actions/auth";
import { FormComponentProps } from "antd/lib/form";
import "./login.scss";
import { InputGroup, Classes, Button } from "@blueprintjs/core";
const FormItem = Form.Item;
interface RegistrationFormProps {
  loading: boolean;
  error: string;
  onAuth(
    username: string,
    email: string,
    displayName: string,
    password1: string,
    password2: string
  ): any;
}

class RegistrationForm extends React.Component<
  RegistrationFormProps & FormComponentProps & RouteComponentProps
> {
  state = {
    confirmDirty: false
  };

  handleSubmit = (e: any) => {
    e.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        this.props.onAuth(
          values.userName,
          values.email,
          values.displayName,
          values.password,
          values.confirm
        );
        this.props.history.push("/");
      }
    });
  };

  handleConfirmBlur = (e: { target: { value: any } }) => {
    const value = e.target.value;
    this.setState({ confirmDirty: this.state.confirmDirty || !!value });
  };

  compareToFirstPassword = (
    rule: any,
    value: any,
    callback: { (arg0: string): void; (): void }
  ) => {
    const form = this.props.form;
    if (value && value !== form.getFieldValue("password")) {
      callback("Two passwords that you enter is inconsistent!");
    } else {
      callback();
    }
  };

  validateToNextPassword = (rule: any, value: any, callback: () => void) => {
    const form = this.props.form;
    if (value && this.state.confirmDirty) {
      form.validateFields(["confirm"], { force: true });
    }
    callback();
  };

  render() {
    const { getFieldDecorator } = this.props.form;

    return (
      <div className={Classes.DARK + " login-container"}>
        <Form
          onSubmit={this.handleSubmit}
          className="login-form .bp3-form-group"
        >
          <h2>Register</h2>
          <FormItem>
            {getFieldDecorator("userName", {
              rules: [
                { required: true, message: "Please input your username!" }
              ]
            })(<InputGroup placeholder="Username" />)}
          </FormItem>
          <FormItem>
            {getFieldDecorator("displayName", {
              rules: [
                { required: true, message: "Please input your display name!" }
              ]
            })(<InputGroup placeholder="Display Name" />)}
          </FormItem>

          <FormItem>
            {getFieldDecorator("email", {
              rules: [
                {
                  type: "email",
                  message: "The input is not valid E-mail!"
                },
                {
                  required: true,
                  message: "Please input your E-mail!"
                }
              ]
            })(<InputGroup placeholder="Email" />)}
          </FormItem>

          <FormItem>
            {getFieldDecorator("password", {
              rules: [
                {
                  required: true,
                  message: "Please input your password!"
                },
                {
                  validator: this.validateToNextPassword
                }
              ]
            })(<InputGroup type="password" placeholder="Password" />)}
          </FormItem>

          <FormItem>
            {getFieldDecorator("confirm", {
              rules: [
                {
                  required: true,
                  message: "Please confirm your password!"
                },
                {
                  validator: this.compareToFirstPassword
                }
              ]
            })(
              <InputGroup
                type="password"
                placeholder="Password"
                onBlur={this.handleConfirmBlur}
              />
            )}
          </FormItem>

          <FormItem>
            <Button className="login-button" type="submit">
              Register
            </Button>
            <p></p>
            <NavLink to="/login">Login</NavLink>
          </FormItem>
        </Form>
      </div>
    );
  }
}

const WrappedRegistrationForm = Form.create()(RegistrationForm);

const mapStateToProps = (state: any) => {
  return {
    loading: state.loading,
    error: state.error
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    onAuth: (
      username: string,
      email: string,
      displayName: string,
      password1: string,
      password2: string
    ) =>
      dispatch(
        actions.authSignup(username, email, displayName, password1, password2)
      )
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(WrappedRegistrationForm);
