import { afterEach, expect, it, vi } from 'vitest';
import { validateImage } from './draft';
afterEach(() => vi.unstubAllGlobals());
it('rejects decodable images above the backend 20-million-pixel limit',async () => {
  vi.stubGlobal('URL',class extends URL { static createObjectURL(){return 'blob:review'} static revokeObjectURL(){} });
  vi.stubGlobal('Image',class {
    naturalWidth=6000; naturalHeight=4000;
    onload: (() => void) | null=null;
    set src(_value:string){ queueMicrotask(() => this.onload?.()); }
  });
  await expect(validateImage(new File(['valid decoder double'],'large.jpg',{type:'image/jpeg'}))).rejects.toThrow();
});
