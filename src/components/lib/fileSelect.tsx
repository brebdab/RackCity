import * as React from "react";

interface FileProps {
  callback: any
}

interface FileState {
  prompt: string
}

export class FileSelector extends React.Component<FileProps, FileState>
{

  public state: FileState = {
    prompt: "Choose file..."
  }

    constructor(props: any)
    {
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(target: any) {
      if (target.files[0].name.split(".")[1] !== "csv") {
        alert("WARNING: file must be .csv. You selected a file of type: ." +
            target.files[0].name.split(".")[1])
      } else {
        this.setState({
          prompt: target.files[0].name
        })
        this.props.callback(target.files[0])
      }
    }

    render ()
    {
        return (
          <label className={"bp3-file-input"}>
            <input type="file" onChange={ (e: any) => { this.handleChange(e.target) } } />
            <span className={"bp3-file-upload-input bp3-text-overflow-ellipsis"}>{this.state.prompt}</span>
          </label>
      );
    }
}

export default FileSelector
