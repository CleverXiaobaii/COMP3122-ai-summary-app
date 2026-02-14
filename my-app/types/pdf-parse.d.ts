declare module 'pdf-parse' {
  function pdfParse(data: Buffer | Uint8Array | ArrayBuffer | { [key: string]: any }): Promise<{ text?: string, info?: any, metadata?: any }>
  export default pdfParse
}
