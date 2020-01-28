import {
  Button,
  Classes,
  FormGroup,
  InputGroup,
  MenuItem
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { API_ROOT } from "../api-config";
import {
  filterString,
  renderCreateItemOption,
  renderStringItem,
  StringSuggest
} from "./formUtils";
import "./login.scss";
import { ModelObject } from "../components/utils";
import { updateObject } from "../store/utility";
//TO DO : add validation of types!!!
export enum FormTypes {
  CREATE = "create",
  MODIFY = "modify"
}

export interface ModelFormProps {
  token: string;
  type: FormTypes;
  initialValues?: ModelObject;
  submitForm(model: ModelObject, headers: any): Promise<any>;
}
interface ModelFormState {
  values: ModelObject;
  vendors: Array<string>;
}

class ModelForm extends React.Component<
  ModelFormProps,
  ModelFormState
> {
  initialState: ModelObject = this.props.initialValues
    ? this.props.initialValues
    : ({} as ModelObject);
  public state = {
    values: this.initialState,
    vendors: []
  };
  headers = {
    headers: {
      Authorization: "Token " + this.props.token
    }
  };

  private handleSubmit = (e: any) => {
    e.preventDefault();
    console.log(this.state);
    if (this.state.values) {
      this.props
        .submitForm(this.state.values, this.headers)
        .catch(err => console.log(err));
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

  handleChange(field: { [key: string]: any }) {
    this.setState({
      values: updateObject(this.state.values, {
        ...field
      })
    });
  }
  required = (values: ModelObject, fieldName: keyof ModelObject): string =>
    values[fieldName] === undefined ||
    values[fieldName] === null ||
    values[fieldName] === ""
      ? "This must be populated"
      : "";

  render() {
    if (this.state.vendors.length === 0) {
      this.getVendors();
    }
    const { values } = this.state;
    return (
      <div className={Classes.DARK + " login-container"}>
        <form
          onSubmit={this.handleSubmit}
          className="create-form bp3-form-group"
        >
          <h2>Add a New Model</h2>
          <FormGroup label="Vendor">
            <StringSuggest
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
          </FormGroup>
          <FormGroup>
            <InputGroup
              className="field"
              onChange={(e: any) =>
                this.handleChange({ model_number: e.currentTarget.value })
              }
              placeholder="model_number"
              value={values.model_number}
            />
          </FormGroup>
          <FormGroup>
            <InputGroup
              className="field"
              placeholder="height"
              value={values.height}
              onChange={(e: any) =>
                this.handleChange({ height: e.currentTarget.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <InputGroup
              className="field"
              placeholder="display_color"
              value={values.display_color}
              onChange={(e: any) =>
                this.handleChange({ display_color: e.currentTarget.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <InputGroup
              className="field"
              placeholder="num_ethernet_ports"
              value={values.num_ethernet_ports}
              onChange={(e: any) =>
                this.handleChange({ num_ethernet_ports: e.currentTarget.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <InputGroup
              className="field"
              placeholder="num_power_ports"
              value={values.num_power_ports}
              onChange={(e: any) =>
                this.handleChange({ num_power_ports: e.currentTarget.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <InputGroup
              className="field"
              placeholder="cpu"
              value={values.cpu}
              onChange={(e: any) =>
                this.handleChange({ cpu: e.currentTarget.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <InputGroup
              className="field"
              placeholder="memory_gb"
              value={values.memory_gb}
              onChange={(e: any) =>
                this.handleChange({ memory_gb: e.currentTarget.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <InputGroup
              className="field"
              placeholder="storage"
              value={values.storage}
              onChange={(e: any) =>
                this.handleChange({ storage: e.currentTarget.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <InputGroup
              className="field"
              placeholder="comment"
              value={values.comment}
              onChange={(e: any) =>
                this.handleChange({ comment: e.currentTarget.value })
              }
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
export default connect(mapStateToProps)(ModelForm);
// const WrappedCreateModelForm = Form.create()(CreateModelForm);

// export default connect(mapStateToProps)(WrappedCreateModelForm);
