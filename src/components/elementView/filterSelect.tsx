import { Button, FormGroup, HTMLSelect, MenuItem } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { Suggest } from "@blueprintjs/select";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import Field from "../../forms/field";
import "../../forms/forms.scss";
import { filterString, renderStringItem } from "../../forms/formUtils";
import { updateObject } from "../../store/utility";
import "./elementView.scss";
import RackRangeForm from "../../forms/rackRangeForm";
import { RackRangeFields } from "../../utils/utils";
import {
  IFilter,
  FilterTypes,
  TextFilterTypes,
  TextFilter,
  NumericFilter,
  getFilterType
} from "./elementUtils";

var console: any = {};
console.log = function() {};

interface FilterSelectProps {
  token: string;
  fields: Array<string>;
  handleAddFilter(filter: IFilter): void;
}

class FilterSelect extends React.Component<
  FilterSelectProps & RouteComponentProps,
  IFilter
> {
  state = {
    id: "",
    field: "",
    filter: undefined,
    filter_type: FilterTypes.TEXT
  };
  renderFilterOptions(field: string | undefined) {
    const type = getFilterType(field);
    if (type === FilterTypes.TEXT) {
      return this.getTextFilterOptions();
    }
    if (type === FilterTypes.NUMERIC) {
      return this.getNumericFilterOptions();
    }
    if (type === FilterTypes.RACKRANGE) {
      return this.getRackFilterOptions();
    }
    return null;
  }
  setTextFilterType(type: TextFilterTypes) {
    this.setState({});
  }
  getRackFilterOptions() {
    return (
      <div className="field">
        <RackRangeForm
          className="field"
          handleChange={this.handleChange}
          range={true}
        />
      </div>
    );
  }
  getNumericFilterOptions() {
    return (
      <div className="field">
        <FormGroup label="Min" className="field">
          <Field
            field="min"
            placeholder="min"
            type="number"
            onChange={this.handleChange}
          />
        </FormGroup>
        <FormGroup label="Max" className="field">
          <Field
            field="max"
            placeholder="max"
            type="number"
            onChange={this.handleChange}
          />
        </FormGroup>
      </div>
    );
  }

  getTextFilterOptions() {
    return (
      <div className="field">
        <div className="bp3-select field test-select">
          <HTMLSelect
            onChange={(e: any) =>
              this.handleChange({ match_type: e.target.value })
            }
          >
            {" "}
            <option> {TextFilterTypes.CONTAINS}</option>
            <option>{TextFilterTypes.EXACT}</option>
          </HTMLSelect>
        </div>
        <FormGroup label="Query" className="field">
          <Field
            field="value"
            placeholder="query"
            type="string"
            onChange={this.handleChange}
          />
        </FormGroup>
      </div>
    );
  }
  setFilterType(field: string) {
    this.setState({
      field: field,
      filter_type: getFilterType(field)
    });
    const type = getFilterType(field);
    if (type === FilterTypes.TEXT) {
      const filter: TextFilter = {
        match_type: TextFilterTypes.CONTAINS
      };
      console.log(updateObject(this.state.filter, { ...filter }));
      this.setState({
        filter: filter
      });
    }
    if (type === FilterTypes.NUMERIC) {
      const filter: NumericFilter = {};
      this.setState({
        filter: filter
      });
    }
    if (type === FilterTypes.RACKRANGE) {
      const filter: RackRangeFields = {} as RackRangeFields;
      this.setState({
        filter: filter
      });
    }
  }
  handleChange = (field: { [key: string]: any }) => {
    const test = updateObject(this.state.filter, {
      ...field
    });
    console.log(
      updateObject(this.state.filter, {
        ...field
      })
    );
    this.setState({
      filter: test
    });
  };
  handleSubmit = (e: any) => {
    e.preventDefault();
    console.log("test");
    const filter: IFilter = {
      field: this.state.field,
      filter_type: this.state.filter_type,
      filter: this.state.filter,
      id: this.state.field + JSON.stringify(this.state.filter)
    };
    console.log(filter);
    this.props.handleAddFilter(filter);
  };
  render() {
    console.log("STATE", this.state);
    return (
      <div className="test-fields">
        <FormGroup className="field" label="Select Field To Filter ">
          {" "}
          <FieldSuggest
            popoverProps={{
              minimal: true,
              popoverClassName: "dropdown",
              usePortal: true
            }}
            inputValueRenderer={(letter: string) => letter}
            itemRenderer={renderStringItem}
            items={this.props.fields}
            onItemSelect={(field: string) => this.setFilterType(field)}
            itemPredicate={filterString}
            noResults={<MenuItem disabled={true} text="No matching fields" />}
          />
        </FormGroup>

        {this.state.field ? (
          <div className="field">
            {" "}
            {this.renderFilterOptions(this.state.field)}{" "}
            <Button
              className="button"
              icon="filter"
              onClick={this.handleSubmit}
            >
              Add Filter
            </Button>{" "}
          </div>
        ) : null}
      </div>
    );
  }
}

const FieldSuggest = Suggest.ofType<string>();

const mapStateToProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};

export default connect(mapStateToProps)(withRouter(FilterSelect));
