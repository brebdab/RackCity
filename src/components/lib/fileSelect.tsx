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

    handleChange(selectorFiles: FileList)
    {
        // console.log(selectorFiles[0].name);
        this.setState({
          prompt: selectorFiles[0].name
        })
        this.props.callback(selectorFiles[0].name)
    }

    render ()
    {
        return (
          <label className={"bp3-file-input"}>
            <input type="file" onChange={ (e: any) => this.handleChange(e.target.files) } />
            <span className={"bp3-file-upload-input bp3-text-overflow-ellipsis"}>{this.state.prompt}</span>
          </label>
      );
    }
}

export default FileSelector
