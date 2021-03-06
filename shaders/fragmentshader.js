module.exports.fragmentshader = `

precision mediump float;

// our texture
uniform sampler2D u_image;

uniform float value_lightnesscontrast;
uniform float value_regularcontrast;
uniform float value_multbright;
uniform float value_multbright_top;
uniform float value_multbright_mid;
uniform float value_multbright_bot;
uniform float value_addbright;
uniform float value_vibrance;
uniform float value_saturation;
uniform float value_sat_contrast;
uniform float value_hueshift;

uniform bool unedited;
uniform bool color;
// the texCoords passed in from the vertex shader.
varying vec2 v_texCoord;

void regularContrast(inout float var, float value);
void lightnessContrast(inout vec4 var, float value);
void saturationContrast(inout vec4 var, float value);
void addSaturation(inout vec4 var, float value);
void addVibrance(inout vec4 var, float compVar, float value);
void addBrightness(inout float var, float value);
//void multBrightness(inout float var, float compVar, float value, float lowEnd, float highEnd);
void multBrightness(inout float var, float compVar, float value, float center);
void RGBtoHSV(inout vec4 var);
void HSVtoRGB(inout vec4 var);

void main() {
   vec4 incol = texture2D(u_image, v_texCoord).rgba;
   vec4 col = incol;

   RGBtoHSV(col);
   RGBtoHSV(incol);

   lightnessContrast(col,value_lightnesscontrast);

   saturationContrast(col,value_sat_contrast);

   addSaturation(col,value_saturation/100.0);

   addVibrance(col, incol.z, value_vibrance/100.0);

   //Multiplicative Brightness Complete
   multBrightness(col.z, incol.z, value_multbright/100.0, 1.0);

   //Multiplicative Brightness Highlights
   multBrightness(col.z, incol.z, value_multbright_top/100.0, 1.0);

   //Multiplicative Brightness Midtones
   multBrightness(col.z, incol.z, value_multbright_mid/100.0, 0.5);

   //Multiplicative Brightness Shadows
   multBrightness(col.z, incol.z, value_multbright_bot/100.0, 0.0);

   col.x += value_hueshift;

   HSVtoRGB(col);
   HSVtoRGB(incol);

   regularContrast(col.r, value_regularcontrast);
   regularContrast(col.g, value_regularcontrast);
   regularContrast(col.b, value_regularcontrast);

   addBrightness(col.r, value_addbright);
   addBrightness(col.g, value_addbright);
   addBrightness(col.b, value_addbright);


   if(!unedited){
     if(!color){
       //Black and white conversion
       float b = 0.0;
       b += col.r * 0.2126;
       b += col.g * 0.7152;
       b += col.b * 0.0722;
       gl_FragColor = vec4(b,b,b,1.0);
     }
     if(color){
       gl_FragColor = col;
     }
   }
   if(unedited){
     gl_FragColor = incol;
   }

}

//HSV
void lightnessContrast(inout vec4 var, float value){
  var.z = (  ( (259.0 * (value + 255.0)) / (255.0 * (259.0 - value)) ) * ( (var.z*255.0) - 128.0  ) + 128.0 )/255.0;
}

void saturationContrast(inout vec4 var, float value){
  var.y = (  ( (259.0 * (value + 255.0)) / (255.0 * (259.0 - value)) ) * ( (var.y*255.0) - 128.0  ) + 128.0 )/255.0;
}

void addSaturation(inout vec4 var, float value){
  var.y *= value;
}

void addVibrance(inout vec4 var, float compVar, float value){
  float diff = (var.y * value) - var.y;
  if(compVar < 0.35 && compVar >= 0.0){
    var += diff*(0.35-abs(0.35-compVar))*(1.0/0.35);
  }else if(compVar > 0.65 && compVar <= 100.0){
    var += diff*(0.35-abs(compVar-0.65))*(1.0/0.35);
  }else{
    var += diff;
  }
}

//RGB
void regularContrast(inout float var, float value){
  var = (  ( (259.0 * (value + 255.0)) / (255.0 * (259.0 - value)) ) * ( (var*255.0) - 128.0  ) + 128.0 )/255.0;
}

//Single Channel
void addBrightness(inout float var, float value){
  var += value;
}

// void multBrightness(inout float var, float compVar, float value, float lowEnd, float highEnd){
//   float diff = var*value - var;
//   float smoothWidth = 0.2;
//   // if(lowEnd <= compVar && compVar <= highEnd ){
//   //   var *= value;
//   // }
//   //if(!(compVar >= lowEnd && compVaw <= highEnd))
//   //If compvar is lower than lowEnd
//   if(compVar <= lowEnd && compVar >= lowEnd-smoothWidth){
//     float d = (pow(smoothWidth-abs(compVar-lowEnd),2.0))*10.0;
//     diff *= d;
//   }//If compar is higher than highEnd
//   else if (compVar >= highEnd && compVar <= highEnd+smoothWidth){
//     float d = (pow(smoothWidth-abs(compVar-highEnd),2.0))*10.0;
//     diff *= d;
//   }else {
//     diff = 0.0;
//   }
//
//   var = var + diff;
// }

void multBrightness(inout float var, float compVar, float value, float center){
  float diff = var*value - var;

  float dist = 1.0-abs(center-compVar);

  var = var + diff*dist;
}


//Color space conversions
void RGBtoHSV(inout vec4 var){
  //https://www.rapidtables.com/convert/color/rgb-to-hsv.html
  //Truncate Values
  if(var.x < 0.0){
    var.x = 0.0;
  }
  if(var.x > 1.0){
    var.x = 1.0;
  }
  if(var.y < 0.0){
    var.y = 0.0;
  }
  if(var.y > 1.0){
    var.y = 1.0;
  }
  if(var.z < 0.0){
    var.z = 0.0;
  }
  if(var.z > 1.0){
    var.z = 1.0;
  }

  float cmax = max(var.x,max(var.y,var.z));
  float cmin = min(var.x,min(var.y,var.z));
  float delta = cmax - cmin;

  //Hue
  float hue;
  if(delta == 0.0){
    hue = 0.0;
  }else if (cmax == var.x){
    hue = 60.0 * mod((var.y-var.z)/delta,6.0);
  }else if (cmax == var.y){
    hue = 60.0 * ((var.z-var.x)/delta+2.0);
  }else if (cmax == var.z){
    hue = 60.0 * ((var.x-var.y)/delta+4.0);
  }

  float saturation;
  if(cmax == 0.0){
    saturation = 0.0;
  }else {
    saturation = delta/cmax;
  }

  float value = cmax;

  var = vec4(hue,saturation,value,var.w);
}

void HSVtoRGB(inout vec4 var){
  //https://www.rapidtables.com/convert/color/hsv-to-rgb.html
  //Truncate Values
  var.x = mod(var.x,360.0);
  if(var.y < 0.0){
    var.y = 0.0;
  }
  if(var.y > 100.0){
    var.y = 100.0;
  }
  if(var.z < 0.0){
    var.z = 0.0;
  }
  if(var.z > 100.0){
    var.z = 100.0;
  }

  float c = var.z * var.y;
  float x = c*(1.0-abs(mod(var.x/60.0,2.0)-1.0));
  float m = var.z -c;

  vec3 rgb;


  if(var.x >= 0.0 && var.x < 60.0){
    rgb = vec3(c,x,0.0);
  }else if(var.x >= 60.0 && var.x < 120.0){
    rgb = vec3(x,c,0.0);
  }else if(var.x >= 120.0 && var.x < 180.0){
    rgb = vec3(0.0,c,x);
  }else if(var.x >= 180.0 && var.x < 240.0){
    rgb = vec3(0.0,x,c);
  }else if(var.x >= 240.0 && var.x < 300.0){
    rgb = vec3(x,0.0,c);
  }else if(var.x >= 300.0 && var.x < 360.0){
    rgb = vec3(c,0.0,x);
  }

  var = vec4(rgb.x+m,rgb.y+m,rgb.z+m,var.w);
}

`;
