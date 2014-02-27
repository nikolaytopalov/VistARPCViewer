nstNodeUtils ; NST - utilities for Node.js ; 02/08/2014  9:38PM
 ;;
 ;;	Author: Nikolay Topalov
 ;;
 ;;	Copyright 2014 Nikolay Topalov
 ;;
 ;;	Licensed under the Apache License, Version 2.0 (the "License");
 ;;	you may not use this file except in compliance with the License.
 ;;	You may obtain a copy of the License at
 ;;
 ;;	http://www.apache.org/licenses/LICENSE-2.0
 ;;
 ;;	Unless required by applicable law or agreed to in writing, software
 ;;	distributed under the License is distributed on an "AS IS" BASIS,
 ;;	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 ;;	See the License for the specific language governing permissions and
 ;;	limitations under the License.
 ;;
 Q
 ;
getRoutine(TMP) ; Return a rouitne
 ; @TMP@("input",0,"value") is the routine name
 N DIF,XCNP,X
 N SRC
 ;
 S X=@TMP@("input",0,"value")  ; routine name
 ;  
 S DIF="SRC(",XCNP=0
 X ^%ZOSF("LOAD")
 M @TMP@("result")=SRC
 Q 1