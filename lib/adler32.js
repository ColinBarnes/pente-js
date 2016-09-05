// Basic hashing function used to generate the game codes
function adler32(data) {
// Original at: https://gist.github.com/volodymyr-mykhailyk/2923823
    var MOD_ADLER = 65521;
    var a = 1, b = 0;
    var index;

    // Process each byte of the data in order
    for (index = 0; index < data.length; ++index) {
        a = (a + data.charCodeAt(index)) % MOD_ADLER;
        b = (b + a) % MOD_ADLER;
    }
    //adler checksum as integer;
    var adler = a | (b << 16);

    //adler checksum as byte array
    return adler.toString(16);
}

module.exports = adler32;
