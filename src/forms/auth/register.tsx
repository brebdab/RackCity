import {
  Button,
  Callout,
  Classes,
  InputGroup,
  Intent
} from "@blueprintjs/core";
import { Form } from "antd";
import { FormComponentProps } from "antd/lib/form";
import axios from "axios";
import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router-dom";
import { API_ROOT } from "../../utils/api-config";
import { getHeaders } from "../../utils/utils";
import "./login.scss";
const FormItem = Form.Item;
interface RegistrationFormProps {
  loading: boolean;
  error: string;
  token: string;
}
var console:any = {};
console.log = function(){};

interface RegistrationFormState {
  errors: Array<string>;
  confirmDirty: boolean;
}

class RegistrationForm extends React.Component<
  RegistrationFormProps & FormComponentProps & RouteComponentProps,
  RegistrationFormState
> {
  public state = {
    confirmDirty: false,
    errors: []
  };
  authSignup = (
    username: string,
    email: string,
    displayName: string,
    password1: string,
    password2: string,
    token: string
  ) => {
    const headers = getHeaders(token);
    return axios
      .post(
        API_ROOT + "rest-auth/registration/",
        {
          username: username,
          email: email,
          displayName: displayName,
          password1: password1,
          password2: password2
        },
        headers
      )
      .then(res => {
        console.log("Created user");
        this.props.history.push("/");
      }) //loginHelper(res, dispatch))
      .catch(err => {
        let errors: Array<string> = this.state.errors;

        errors.push(JSON.stringify(err.response.data));
        this.setState({
          errors: errors
        });
        console.log(errors);
        // dispatch(authFail(err));
      });
  };

  handleSubmit = (e: any) => {
    e.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        this.authSignup(
          values.userName,
          values.email,
          values.displayName,
          values.password,
          values.confirm,
          this.props.token
        );
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
        {this.state.errors.map((err: string) => {
          return <Callout intent={Intent.DANGER}>{err}</Callout>;
        })}
        <Form
          onSubmit={this.handleSubmit}
          className="login-form .bp3-form-group"
        >
          <h2>Add a new user</h2>
          <FormItem label="Username (required) ">
            {getFieldDecorator("userName", {
              rules: [
                { required: true, message: "Please input your username!" }
              ]
            })(<InputGroup placeholder="Username" />)}
          </FormItem>
          <FormItem label="First Name (required)">
            {getFieldDecorator("firstName", {
              rules: [
                { required: true, message: "Please input your first name!" }
              ]
            })(<InputGroup placeholder="first name" />)}
          </FormItem>
          <FormItem label="Last Name (required)">
            {getFieldDecorator("lastName", {
              rules: [
                { required: true, message: "Please input your last name!" }
              ]
            })(<InputGroup placeholder="last name" />)}
          </FormItem>

          <FormItem label="Email (required)">
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
            })(<InputGroup placeholder="email" />)}
          </FormItem>

          <FormItem label="Password (required) ">
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

          <FormItem label="Password Confirmation (required) ">
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
              Add
            </Button>
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
    error: state.error,
    token: state.token
  };
};

// const mapDispatchToProps = (dispatch: any) => {
//   return {
//     onAuth: (
//       username: string,
//       email: string,
//       displayName: string,
//       password1: string,
//       password2: string
//     ) =>
//       dispatch(
//         actions.authSignup(username, email, displayName, password1, password2)
//       )
//   };
// };

export default connect(mapStateToProps)(WrappedRegistrationForm);
