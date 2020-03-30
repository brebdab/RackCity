import * as React from "react";

import { ChangePlan, getHeaders } from "../utils/utils";
import { updateObject } from "../store/utility";
import { Classes, Intent, Callout, FormGroup, Button } from "@blueprintjs/core";
import Field from "./field";
import { connect } from "react-redux";

interface ChangePlanFormProps {
  token: string;
  initialValues?: ChangePlan;
  submitForm(changePlan: ChangePlan, headers: any): Promise<any> | void;
}
interface ChangePlanFormState {
  values: ChangePlan;
  errors: Array<string>;
}

class ChangePlanForm extends React.Component<
  ChangePlanFormProps,
  ChangePlanFormState
> {
  initialState: ChangePlan = this.props.initialValues
    ? JSON.parse(JSON.stringify(this.props.initialValues))
    : ({} as ChangePlan);

  public state = {
    values: this.initialState,
    errors: []
  };
  handleChange = (field: { [key: string]: any }) => {
    this.setState({
      values: updateObject(this.state.values, {
        ...field
      })
    });
  };
  private handleSubmit = (e: any) => {
    e.preventDefault();
    if (this.state.values) {
      this.setState({
        errors: []
      });
      if (this.props.initialValues) {
        this.setState({
          values: updateObject(this.state.values, {
            id: this.props.initialValues.id
          })
        });
      }

      const resp = this.props.submitForm(
        this.state.values,
        getHeaders(this.props.token)
      );
      if (resp) {
        resp.catch(err => {
          let errors: Array<string> = this.state.errors;
          errors.push(err.response.data.failure_message as string);
          this.setState({
            errors: errors
          });
        });
      }
    }
  };
  render() {
    return (
      <div className={Classes.DARK + " login-container"}>
        {this.state.errors.map((err: string) => {
          return <Callout intent={Intent.DANGER}>{err}</Callout>;
        })}
        <form
          onSubmit={this.handleSubmit}
          className="create-form bp3-form-group"
        >
          <FormGroup label="Change Plan Name">
            <Field
              field="name"
              value={this.state.values.name}
              onChange={this.handleChange}
            />
          </FormGroup>
          <Button className="login-button" type="submit">
            Submit
          </Button>
        </form>
      </div>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    token: state.token
  };
};
export default connect(mapStateToProps)(ChangePlanForm);
