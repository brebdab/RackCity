import {
  Button,
  Callout,
  FormGroup,
  Intent,
  MenuItem,
  Switch
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { handleBooleanChange } from "@blueprintjs/docs-theme";
import { Suggest } from "@blueprintjs/select";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../api-config";
import Field from "../../forms/field";
import "../../forms/forms.scss";
import { filterString, renderStringItem } from "../../forms/formUtils";
import { updateObject } from "../../store/utility";
import { getHeaders } from "../utils";
import "./elementView.scss";
import { RackRangeFields } from "./rackSelectView";

export enum FilterTypes {
  TEXT = "text",
  NUMERIC = "numeric",
  RACKRANGE = "rack_range"
}
export interface NumericFilter {
  min: number;
  max: number;
}
export interface TextFilter {
  value: string;
  match_type: string;
}
export interface IFilter {
  field: string;
  filter_type: FilterTypes;
  filter: TextFilter | NumericFilter | RackRangeFields;
}
interface FilterSelectViewState {}

interface FilterSelectViewProps {
  token: string;
  fields: Array<string>;
}
class FilterSelectView extends React.Component<
  FilterSelectViewProps & RouteComponentProps,
  FilterSelectViewState
> {
  render() {
    return <FormGroup label="Select Field To Filter "></FormGroup>;
  }
}

const FieldSuggest = Suggest.ofType<string>();
const items = [""];
const mapStateToProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};

export default connect(mapStateToProps)(withRouter(FilterSelectView));
