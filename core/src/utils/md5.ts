import md5 from '../lib/js-md5';

export default function md5salt(string: string, salt = "azxsw", iterations = 5) {
    let result = string;
    for(let i = 0; i < iterations; i++) {
        result = md5(result + salt);
    }
    return result;
}
