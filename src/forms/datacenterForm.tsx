import { Button, Callout, Classes, FormGroup, Intent } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { connect } from "react-redux";
import { DatacenterObject } from "../utils/utils";
import { updateObject } from "../store/utility";
import Field from "./field";
import "./forms.scss";
import { FormTypes } from "./formUtils";

//TO DO : add validation of types!!!
var console: any = {};
console.log = function () {};

export interface DatacenterFormProps {
  token: string;
  type: FormTypes;
  initialValues?: DatacenterObject;
  submitForm(model: DatacenterObject, headers: any): Promise<any> | void;
}
interface DatacenterFormState {
  values: DatacenterObject;
  errors: Array<string>;
}

export const required = (
  values: DatacenterObject,
  fieldName: keyof DatacenterObject
): string =>
  values[fieldName] === undefined ||
  values[fieldName] === null ||
  values[fieldName] === ""
    ? "This must be populated"
    : "";

class DatacenterForm extends React.Component<
  DatacenterFormProps,
  DatacenterFormState
> {
  initialState: DatacenterObject = this.props.initialValues
    ? this.props.initialValues
    : ({} as DatacenterObject);
  public state = {
    values: this.initialState,
    errors: [],
  };
  headers = {
    headers: {
      Authorization: "Token " + this.props.token,
    },
  };

  private handleSubmit = (e: any) => {
    this.setState({
      errors: [],
    });
    e.preventDefault();
    console.log(this.state);
    if (this.state.values) {
      if (this.props.initialValues) {
        console.log(this.props.initialValues);
        this.setState({
          values: updateObject(this.state.values, {
            id: this.props.initialValues.id,
          }),
        });
      }

      const resp = this.props.submitForm(this.state.values, this.headers);
      if (resp) {
        resp.catch((err) => {
          console.log(err.response.data.failure_message);
          let errors: Array<string> = this.state.errors;
          errors.push(err.response.data.failure_message as string);
          this.setState({
            errors: errors,
          });
        });
      }
    }
  };

  handleChange = (field: { [key: string]: any }) => {
    this.setState({
      values: updateObject(this.state.values, {
        ...field,
      }),
    });
  };
  selectText = (event: any) => event.target.select();

  render() {
    const { values } = this.state;
    return (
      <div className={Classes.DARK + " login-container"}>
        {this.state.errors.map((err: string) => {
          return <Callout intent={Intent.DANGER}>{err}</Callout>;
        })}
        <form
          onSubmit={this.handleSubmit}
          className="create-form bp3-form-group"
        >
          <FormGroup label="Name*" inline={false}>
            <Field
              field="name"
              placeholder="name"
              value={values.name}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup label="Abbreviation* (up to 6 characters)" inline={false}>
            <Field
              placeholder="abbreviation"
              onChange={this.handleChange}
              value={values.abbreviation}
              field="abbreviation"
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
    token: state.token,
  };
};
export default connect(mapStateToProps)(DatacenterForm);
// const WrappedCreateModelForm = Form.create()(CreateModelForm);

// export default connect(mapStateToProps)(WrappedCreateModelForm);
