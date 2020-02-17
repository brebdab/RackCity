import {
  Button,
  Callout,
  Classes,
  FormGroup,
  Intent,
  MenuItem
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { connect } from "react-redux";

import {
  AssetObject,
  ModelObject,
  AssetInfoObject,
  getHeaders,
  RackObject,
  ElementObjectType
} from "../utils/utils";
import { updateObject } from "../store/utility";
import Field from "./field";
import "./forms.scss";
import {
  filterModel,
  ModelSelect,
  renderModelItem,
  RackSelect,
  renderRackItem,
  filterRack,
  FormTypes,
  renderStringItem,
  filterString,
  StringSelect
} from "./formUtils";
import axios from "axios";
import { API_ROOT } from "../utils/api-config";
import { PagingTypes } from "../components/elementView/elementUtils";

//TO DO : add validation of types!!!

export interface AssetFormProps {
  token: string;
  type: FormTypes;
  initialValues?: AssetObject;
  submitForm(Asset: AssetInfoObject, headers: any): Promise<any> | void;
}
interface AssetFormState {
  values: AssetObject;
  racks: Array<RackObject>;
  models: Array<ModelObject>;
  errors: Array<string>;
  users: Array<string>;
}
var console: any = {};
console.log = function() {};

export const required = (
  values: AssetObject,
  fieldName: keyof AssetObject
): string =>
  values[fieldName] === undefined ||
  values[fieldName] === null ||
  values[fieldName] === ""
    ? "This must be populated"
    : "";

class AssetForm extends React.Component<AssetFormProps, AssetFormState> {
  initialState: AssetObject = this.props.initialValues
    ? this.props.initialValues
    : ({} as AssetObject);
  public state = {
    values: this.initialState,
    racks: [],
    models: [],
    errors: [],
    users: []
  };
  headers = {
    headers: {
      Authorization: "Token " + this.props.token
    }
  };

  private getElementData(
    path: string,
    page: number,
    page_type: PagingTypes,
    body: any,
    token: string
  ): Promise<Array<ElementObjectType>> {
    console.log(API_ROOT + "api/" + path + "/get-many");

    const params =
      page_type === PagingTypes.ALL
        ? {}
        : {
            page_size: page_type,
            page
          };
    const config = {
      headers: {
        Authorization: "Token " + token
      },

      params: params
    };
    return axios
      .post(API_ROOT + "api/" + path + "/get-many", body, config)
      .then(res => {
        const items = res.data[path];

        return items;
      });
  }
  private mapAssetObject = (asset: AssetObject): AssetInfoObject => {
    console.log(asset);

    const { hostname, id, rack_position, owner, comment } = asset;
    const model = asset.model ? asset.model.id : undefined;
    const rack = asset.rack ? asset.rack.id : undefined;
    let valuesToSend: AssetInfoObject = {
      model,
      rack,
      hostname,
      id,
      rack_position,
      owner,
      comment
    };
    console.log(valuesToSend);

    return valuesToSend;
  };
  private handleSubmit = (e: any) => {
    this.setState({
      errors: []
    });
    e.preventDefault();
    if (this.state.values) {
      if (this.props.initialValues) {
        this.setState({
          values: updateObject(this.state.values, {
            id: this.props.initialValues.id
          })
        });
      }

      const resp = this.props.submitForm(
        this.mapAssetObject(this.state.values),
        this.headers
      );
      if (resp) {
        resp.catch(err => {
          console.log(err.response.data.failure_message);
          let errors: Array<string> = this.state.errors;
          errors.push(err.response.data.failure_message as string);
          this.setState({
            errors: errors
          });
        });
      }
    }
  };

  handleChange = (field: { [key: string]: any }) => {
    this.setState({
      values: updateObject(this.state.values, {
        ...field
      })
    });
  };
  getUsers = (token: string) => {
    const headers = getHeaders(token);
    axios
      .get(API_ROOT + "api/usernames", headers)
      .then(res => {
        this.setState({
          users: res.data.usernames
        });
      })
      .catch(err => {
        console.log(err);
      });
  };
  getRacks = (token: string) => {
    const headers = getHeaders(token);
    console.log(API_ROOT + "api/racks/summary");
    axios
      .get(API_ROOT + "api/racks/summary", headers)
      .then(res => {
        console.log(res.data.racks);
        this.setState({
          racks: res.data.racks as Array<RackObject>
        });
      })
      .catch(err => {
        console.log(err);
      });
  };
  render() {
    console.log(this.state.values);
    if (this.state.models.length === 0) {
      this.getElementData(
        "models",
        1,
        PagingTypes.ALL,
        {},
        this.props.token
      ).then(res => {
        this.setState({
          models: res as Array<ModelObject>
        });
      });
    }
    if (this.state.racks.length === 0) {
      this.getRacks(this.props.token);
    }
    if (this.state.users.length === 0) {
      this.getUsers(this.props.token);
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
          <FormGroup label="Hostname (required)" inline={false}>
            <Field
              placeholder="hostname"
              onChange={this.handleChange}
              value={values.hostname}
              field="hostname"
            />
          </FormGroup>
          <FormGroup label="Rack position (required)" inline={false}>
            <Field
              field="rack_position"
              placeholder="rack_position"
              value={values.rack_position}
              onChange={this.handleChange}
            />
          </FormGroup>

          <FormGroup label="Model (required)" inline={false}>
            <ModelSelect
              className="select"
              popoverProps={{
                minimal: true,
                popoverClassName: "dropdown",
                usePortal: true
              }}
              items={this.state.models}
              onItemSelect={(model: ModelObject) =>
                this.setState({
                  values: updateObject(values, { model: model })
                })
              }
              itemRenderer={renderModelItem}
              itemPredicate={filterModel}
              noResults={<MenuItem disabled={true} text="No results." />}
            >
              <Button
                rightIcon="caret-down"
                text={
                  this.state.values.model
                    ? this.state.values.model.vendor +
                      " " +
                      this.state.values.model.model_number
                    : "Select a model"
                }
              />
            </ModelSelect>
          </FormGroup>
          <FormGroup label="Rack (required)" inline={false}>
            <RackSelect
              popoverProps={{
                minimal: true,
                popoverClassName: "dropdown",
                usePortal: true
              }}
              items={this.state.racks}
              onItemSelect={(rack: RackObject) =>
                this.setState({
                  values: updateObject(values, { rack: rack })
                })
              }
              itemRenderer={renderRackItem}
              itemPredicate={filterRack}
              noResults={<MenuItem disabled={true} text="No results." />}
            >
              <Button
                rightIcon="caret-down"
                text={
                  this.state.values.rack
                    ? this.state.values.rack.row_letter +
                      " " +
                      this.state.values.rack.rack_num
                    : "Select a rack"
                }
              />
            </RackSelect>
          </FormGroup>
          <FormGroup label="Owner" inline={false}>
            <StringSelect
              popoverProps={{
                minimal: true,
                popoverClassName: "dropdown",
                usePortal: true
              }}
              // defaultSelectedItem={this.state.values.owner}
              // inputValueRenderer={(vendor: string) => vendor}
              items={this.state.users}
              onItemSelect={(owner: string) =>
                this.setState({
                  values: updateObject(values, { owner: owner })
                })
              }
              // createNewItemRenderer={renderCreateItemOption}
              itemRenderer={renderStringItem}
              itemPredicate={filterString}
              noResults={<MenuItem disabled={true} text="No results." />}
            >
              <Button
                rightIcon="caret-down"
                text={
                  this.state.values.owner
                    ? this.state.values.owner
                    : "Select an owner"
                }
              />
            </StringSelect>
            {/* <Field
              field="owner"
              placeholder="owner"
              value={values.owner}
              onChange={this.handleChange}
            /> */}
          </FormGroup>
          <FormGroup label="Comment" inline={false}>
            <Field
              field="comment"
              placeholder="comment"
              value={values.comment}
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
export default connect(mapStateToProps)(AssetForm);
// const WrappedCreateAssetForm = Form.create()(CreateAssetForm);

// export default connect(mapStateToProps)(WrappedCreateAssetForm);
