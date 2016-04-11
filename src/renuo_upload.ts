class RenuoUpload {
  private apiKey:string;
  private signingUrl:string;
  private fileUrlPath:string;
  private filePrefix:string;

  constructor(private element:HTMLElement, private dropzoneOptions:DropzoneOptions, private callback:Function) {
    this.checkRequirements();
    this.initializeOptions();
    this.checkAdaptParams();
    jQuery.when(this.getUploadInfoAndSignature()).done(this.initializeDropzone);
  }

  private initializeDropzone() {
    Dropzone.autoDiscover = false;

    jQuery(this.element).addClass('dropzone');
    const uploadDropzone:Dropzone = new Dropzone(this.element, this.dropzoneOptions);

    uploadDropzone.on('success', (file) => this.callback(this.buildResult(file)));

    uploadDropzone.on('error', () => {
      //todo inform sentry/new relic
    });
  }

  private initializeOptions() {
    this.apiKey = jQuery(this.element).data('apikey');
    this.signingUrl = jQuery(this.element).data('signingurl');
  }

  private cleanFilename(originalName:string):string {
    return originalName.toLowerCase().replace(/[ _]/g, '-').replace(/[^\w-.]/g, '');
  }

  private getExtension(originalName:string):string {
    return originalName.split('.').pop();
  }

  private getShortName(cleanName:string):string {
    return cleanName.replace(/\.[^/.]+$/, '');
  }

  private getPublicUrl(cleanName:string):string {
    return `${this.fileUrlPath}#{cleanName}`;
  }

  private getFilePath(cleanName:string):string {
    return `${this.filePrefix}#{cleanName}`;
  }

  private getUploadInfoAndSignature() {
    jQuery.ajax({
      type: 'POST',
      url: this.signingUrl,
      data: {
        api_key: this.apiKey,
      },
      dataType: 'json'
    }).done((responseJson) => {
      this.dropzoneOptions.url = responseJson.url;
      this.dropzoneOptions.params = {};
      jQuery.each(responseJson.data, (k:string, v:string) => {
        this.dropzoneOptions.params[k.replace(/_/g, '-')] = v;
      });
      this.filePrefix = responseJson.file_prefix;
      this.fileUrlPath = responseJson.file_url_path;
    }).fail(() => {
      throw new Error('Failed to get credential for upload.');
    });
  }

  private buildResult(file):RenuoUploadResult {
    const cleanFilename:string = this.cleanFilename(file.name);
    return {
      orginalName: file.name,
      cleanName: cleanFilename,
      name: this.getShortName(cleanFilename),
      extension: this.getExtension(file.name),
      size: file.size,
      publicUrl: this.getPublicUrl(cleanFilename),
      filePath: this.getFilePath(cleanFilename)
    };
  }

  private checkAdaptParams() {
    this.checkElement();
    this.adaptCallback();
    this.adaptOptions();
  }

  private checkRequirements() {
    if (typeof jQuery === 'undefined' || jQuery === null)
      throw new Error('RenuoUpload needs jQuery.');
    if (typeof Dropzone === 'undefined' || Dropzone === null)
      throw new Error('RenuoUpload needs Dropzone.');
  }

  private checkElement() {
    if (typeof this.element === 'undefined' || this.element === null)
      throw new Error('Element is not defined');
    if (typeof this.element[0].nodeType !== 'undefined' && typeof this.element[0].nodeType !== null)
      this.element = this.element[0];
    if (typeof this.element.nodeType === 'undefined' || this.element.nodeType === null)
      throw new Error('Element is not a valid element');
  }

  private adaptOptions() {
    if (typeof this.dropzoneOptions === 'undefined' || this.dropzoneOptions === null)
      throw new Error('DropzoneOptions is not defined');
    if (typeof this.dropzoneOptions.acceptedFiles === 'undefined' || this.dropzoneOptions.acceptedFiles === null)
      throw new Error('DropzoneOptions.acceptedFiles is not defined');
    if (typeof this.dropzoneOptions.acceptedFiles !== 'string')
      throw new Error('DropzoneOptions.acceptedFiles is not a string');
    if (typeof this.dropzoneOptions.parallelUploads === 'undefined' || this.dropzoneOptions.parallelUploads === null)
      this.dropzoneOptions.parallelUploads = 25;
    if (typeof this.dropzoneOptions.renameFilename === 'undefined' || this.dropzoneOptions.renameFilename === null)
      this.dropzoneOptions.renameFilename = this.cleanFilename;
  }

  private adaptCallback() {
    if (typeof this.callback !== 'function')
      this.callback = this.defaultCallback;
  }

  private defaultCallback(result:RenuoUploadResult) {
    if (jQuery(this.element).parents('form').length) {
      name = result.name
      //TODO discuss with Lukas about upload of two times the same file
      delete result.name
      //TODO check if necessary, unexpected behavior, good point from Y
      jQuery.each(result, (k, v) => {
        const parentForm:JQuery = jQuery(this.element).parents('form');
        parentForm.append(`<input type='hidden' name='renuoupload[${name}][${k}]' value='${v}'>`);
      });
    }
  }
}
if (typeof module !== 'undefined' && module !== null)
  module.exports = RenuoUpload;
else
  window.RenuoUpload = RenuoUpload;


