import {
  Button,
  Classes,
  FormGroup,
  MenuItem,
  Callout,
  Intent
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { API_ROOT } from "../api-config";
import { InstanceObject } from "../components/utils";
import { updateObject } from "../store/utility";
import Field, { IFieldProps } from "./field";
import {
  filterString,
  renderCreateItemOption,
  renderStringItem,
  StringSuggest
} from "./formUtils";
import "./login.scss";
//TO DO : add validation of types!!!
export enum FormTypes {
  CREATE = "create",
  MODIFY = "modify"
}

export interface InstanceFormProps {
  token: string;
  type: FormTypes;
  initialValues?: InstanceObject;
  submitForm(Instance: InstanceObject, headers: any): Promise<any>;
}
interface InstanceFormState {
  values: InstanceObject;
  vendors: Array<string>;
  errors: Array<string>;
}

export const required = (
  values: InstanceObject,
  fieldName: keyof InstanceObject
): string =>
  values[fieldName] === undefined ||
  values[fieldName] === null ||
  values[fieldName] === ""
    ? "This must be populated"
    : "";

class InstanceForm extends React.Component<
  InstanceFormProps,
  InstanceFormState
> {
  initialState: InstanceObject = this.props.initialValues
    ? this.props.initialValues
    : ({} as InstanceObject);
  public state = {
    values: this.initialState,
    vendors: [],
    errors: []
  };
  headers = {
    headers: {
      Authorization: "Token " + this.props.token
    }
  };

  private handleSubmit = (e: any) => {
    this.setState({
      errors: []
    });
    e.preventDefault();
    console.log(this.state);
    if (this.state.values) {
      if (this.props.initialValues) {
        console.log(this.props.initialValues);
        this.setState({
          values: updateObject(this.state.values, {
            id: this.props.initialValues.id
          })
        });
      }
      this.props.submitForm(this.state.values, this.headers).catch(err => {
        console.log(err.response.data.failure_message);
        let errors: Array<string> = this.state.errors;
        errors.push(err.response.data.failure_message as string);
        this.setState({
          errors: errors
        });
      });
    }
  };

  private getVendors() {
    axios
      //.get("https://rack-city-dev.herokuapp.com/api/" + path)
      .get(API_ROOT + "api/models/vendors", this.headers)
      .then(res => {
        const vendors: Array<string> = res.data.vendors;
        this.setState({
          vendors: vendors
        });
      })
      .catch(err => {
        console.log(err);
      });
  }

  handleChange = (field: { [key: string]: any }) => {
    this.setState({
      values: updateObject(this.state.values, {
        ...field
      })
    });
  };

  render() {
    console.log(this.state.values);
    if (this.state.vendors.length === 0) {
      this.getVendors();
    }
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
          <h2>Add a New Instance</h2>
          {/* <FormGroup label="Vendor">
              <StringSuggest
                defaultSelectedItem={this.state.values.vendor}
                inputValueRenderer={(vendor: string) => vendor}
                items={this.state.vendors}
                onItemSelect={(vendor: string) =>
                  this.setState({
                    values: updateObject(values, { vendor: vendor })
                  })
                }
                createNewItemRenderer={renderCreateItemOption}
                createNewItemFromQuery={(vendor: string) => vendor}
                itemRenderer={renderStringItem}
                itemPredicate={filterString}
                noResults={<MenuItem disabled={true} text="No results." />}
              />
            </FormGroup> */}

          <FormGroup>
            <Field
              className="field"
              placeholder="hostname"
              onChange={this.handleChange}
              value={values.hostname}
              field="hostnmae"
            />
          </FormGroup>
          <FormGroup>
            <Field
              field="elevation"
              className="field"
              placeholder="elevation"
              value={values.elevation}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup>
            <Field
              field="model"
              className="field"
              placeholder="model"
              value="modelObject"
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup>
            <Field
              field="rack"
              className="field"
              placeholder="rack"
              value="rackObject"
              onChange={this.handleChange}
            />
          </FormGroup>

          <FormGroup>
            <Field
              field="owner"
              className="field"
              placeholder="owner"
              value={values.owner}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup>
            <Field
              field="comment"
              className="field"
              placeholder="comment"
              value={values.comment}
              onChange={this.handleChange}
            />
          </FormGroup>

          <Button className="login-button" type="submit">
            Login
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
export default connect(mapStateToProps)(InstanceForm);
// const WrappedCreateInstanceForm = Form.create()(CreateInstanceForm);

// export default connect(mapStateToProps)(WrappedCreateInstanceForm);
