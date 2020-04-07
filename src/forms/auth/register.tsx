import {
  Button,
  Callout,
  Classes,
  InputGroup,
  Intent,
} from "@blueprintjs/core";
import { Form } from "antd";
import { FormComponentProps } from "antd/lib/form";
import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router-dom";
import { CreateUserObject, getHeaders } from "../../utils/utils";
import "./login.scss";

const FormItem = Form.Item;
interface RegistrationFormProps {
  loading: boolean;
  error: string;
  token: string;
}

interface RegistrationFormSubmitProps {
  authSignup(user: CreateUserObject, headers: any): Promise<any> | void;
}
var console: any = {};
console.log = function () {};

interface RegistrationFormState {
  errors: Array<string>;
  confirmDirty: boolean;
}

class RegistrationForm extends React.Component<
  RegistrationFormProps &
    FormComponentProps &
    RegistrationFormSubmitProps &
    RouteComponentProps,
  RegistrationFormState
> {
  public state = {
    confirmDirty: false,
    errors: [],
  };

  handleSubmit = (e: any) => {
    e.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      console.log("calling authSignup");
      const user: CreateUserObject = {
        username: values.userName,
        email: values.email,
        first_name: values.firstName,
        last_name: values.lastName,
        password1: values.password,
        password2: values.confirm,
      };
      if (!err) {
        const resp = this.props.authSignup(user, getHeaders(this.props.token));
        if (resp) {
          resp.catch((err) => {
            console.log(err);
            let errors: Array<string> = [];

            Object.entries(err.response.data).forEach(([field, error]) => {
              errors.push(field + ": " + error);
            });

            this.setState({
              errors: errors,
            });
            console.log(errors);
            // dispatch(authFail(err));
          });
        }
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
          <FormItem label="Username*">
            {getFieldDecorator("userName", {
              rules: [
                { required: true, message: "Please input your username!" },
              ],
            })(<InputGroup placeholder="Username" />)}
          </FormItem>
          <FormItem label="First Name*">
            {getFieldDecorator("firstName", {
              rules: [
                { required: true, message: "Please input your first name!" },
              ],
            })(<InputGroup placeholder="first name" />)}
          </FormItem>
          <FormItem label="Last Name*">
            {getFieldDecorator("lastName", {
              rules: [
                { required: true, message: "Please input your last name!" },
              ],
            })(<InputGroup placeholder="last name" />)}
          </FormItem>

          <FormItem label="Email*">
            {getFieldDecorator("email", {
              rules: [
                {
                  type: "email",
                  message: "The input is not valid E-mail!",
                },
                {
                  required: true,
                  message: "Please input your E-mail!",
                },
              ],
            })(<InputGroup placeholder="email" />)}
          </FormItem>

          <FormItem label="Password*">
            {getFieldDecorator("password", {
              rules: [
                {
                  required: true,
                  message: "Please input your password!",
                },
                {
                  validator: this.validateToNextPassword,
                },
              ],
            })(<InputGroup type="password" placeholder="Password" />)}
          </FormItem>

          <FormItem label="Password Confirmation*">
            {getFieldDecorator("confirm", {
              rules: [
                {
                  required: true,
                  message: "Please confirm your password!",
                },
                {
                  validator: this.compareToFirstPassword,
                },
              ],
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

const WrappedRegistrationForm = Form.create()(withRouter(RegistrationForm));

function addProps(RegForm: any) {
  return class extends React.Component<RegistrationFormSubmitProps> {
    render() {
      return <RegForm {...this.props} />;
    }
  };
}
const mapStateToProps = (state: any) => {
  return {
    loading: state.loading,
    error: state.error,
    token: state.token,
  };
};

export default addProps(connect(mapStateToProps)(WrappedRegistrationForm));
