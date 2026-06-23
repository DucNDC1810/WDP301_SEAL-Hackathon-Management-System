import '../src/config/db.js';
import Team from '../src/models/Team.js';

const teams = await Team.find({
  assigned_group: { $in: ['Bảng A', 'Bảng B', 'A', 'B'] }
}).select('team_name assigned_group tiebreak_rule tiebreak_status penalty_score').lean();

console.log(JSON.stringify(teams, null, 2));
process.exit(0);
