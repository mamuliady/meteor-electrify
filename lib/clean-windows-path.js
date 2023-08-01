/**
 * Adjust Windows paths when using POSIX shells like git bash or cygwin
 */
const path = require('node:path');
const {existsSync} = require('node:fs');
const os = require('node:os');
const platform = os.platform();

module.exports = function(pathString){
    let cleanPath = pathString;    
    const platformString = process.env.PLATFORM_ENV ? process.env.PLATFORM_ENV : platform;
    if(platformString.toLowerCase().includes('mingw64_nt') || platformString.toLowerCase().includes('cygwin')){
        if(!existsSync(pathString)){
            let pathComponents, driveLetter;
            if(pathString.includes(':\\')){
                // windows path; convert to POSIX
                pathComponents = pathString.split('\\');
                driveLetter = pathComponents.shift().replace(':', '').toLowerCase();
                cleanPath = `${driveLetter}/${pathComponents.join('/')}`;               
            } else {
                //POSIX path; convert to windows
                console.log(`PATH: ${pathString}`);
                pathComponents = pathString.split('/');
                driveLetter = pathComponents.shift().toUpperCase();
                cleanPath = `${driveLetter}:\\${pathComponents.join('\\')}`;
                console.log(`RETURNING CLEAN PATH: ${cleanPath}`);                
            }
        }               
    }    
    return cleanPath;
}
