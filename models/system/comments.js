const mongoose = require('mongoose');

const commentSchema = mongoose.Schema(
  {
    employee_id:{
      type:String,
      required:true
    },
    comment:{
      type:String,
      required:true
    },
    date_logged:{
      type:Number,
      required:true
    },
    job_id:{
      type:String,
      required:true
    }
  });
